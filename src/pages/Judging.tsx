/**
 * Main judging page component.
 * Displays judge dashboard with teams and scoresheets for a specific judge.
 */

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Button
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useJudgeStore } from "../store/primary_stores/judgeStore";
import { useAuthStore } from "../store/primary_stores/authStore";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMapClusterJudgeStore } from "../store/map_stores/mapClusterToJudgeStore";
import useClusterTeamStore from "../store/map_stores/mapClusterToTeamStore";
// Lazy load the heavy dashboard table for faster initial render
const JudgeDashboardTable = React.lazy(() => import("../components/Tables/JudgeDashboardTable"));
import theme from "../theme";
import { Team, ClusterWithContest, Contest } from "../types";
import { api } from "../lib/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useMapContestToTeamStore } from "../store/map_stores/mapContestToTeamStore";
import { useContestStore } from "../store/primary_stores/contestStore";
import { onDataChange, DataChangeEvent } from "../utils/dataChangeEvents";
import { useMapScoreSheetStore } from "../store/map_stores/mapScoreSheetStore";

// -----------------------------------------------------------------------------
// Small presentational components
// -----------------------------------------------------------------------------

/**
 * Simple stat card used for "Teams Assigned" etc.
 */
const StatCard = ({ value, label }: { value: number | string; label: string }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 2,
      border: `1px solid ${theme.palette.grey[200]}`,
      background: `linear-gradient(135deg, #ffffff 0%, #fafafa 100%)`,
      boxShadow: `0 2px 8px rgba(76, 175, 80, 0.08)`,
      transition: "all 0.2s ease-in-out",
      "&:hover": {
        boxShadow: `0 4px 16px rgba(76, 175, 80, 0.12)`,
        transform: "translateY(-1px)"
      }
    }}
  >
    <CardContent sx={{ py: 1.5, px: 2, position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: theme.palette.success.light,
          opacity: 0.1
        }}
      />
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: theme.palette.success.dark,
          lineHeight: 1,
          mb: 0.5
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 500 }}
      >
        {label}
      </Typography>
    </CardContent>
  </Card>
);

// -----------------------------------------------------------------------------
// Main component: Judging Dashboard
// -----------------------------------------------------------------------------

export default React.memo(function Judging() {
  // ---------------------------------------------------------------------------
  // Store hooks (global state)
  // ---------------------------------------------------------------------------

  const { mappings, fetchScoreSheetsByJudge, clearMappings } =
    useMapScoreSheetStore();

  const clearContests = useMapContestToTeamStore((state) => state.clearContests);
  const setContestsForTeams = useMapContestToTeamStore(
    (state) => state.setContestsForTeams
  );

  const { judgeId } = useParams();
  const judgeIdNumber = judgeId ? parseInt(judgeId, 10) : null;

  const navigate = useNavigate();

  const { judge, fetchJudgeById } = useJudgeStore();
  const { role } = useAuthStore();

  const { fetchAllClustersByJudgeId } = useMapClusterJudgeStore();

  const mapClusterToTeamError = useClusterTeamStore(
    (state) => state.mapClusterToTeamError
  );
  const fetchTeamsByClusterId = useClusterTeamStore(
    (state) => state.fetchTeamsByClusterId
  );
  const teamsByClusterId = useClusterTeamStore(
    (state) => state.teamsByClusterId
  );

  // ---------------------------------------------------------------------------
  // Local state & refs
  // ---------------------------------------------------------------------------

  const [fadeIn, setFadeIn] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [visibleTeamsCount, setVisibleTeamsCount] = useState<number>(0);

  const [currentCluster, setCurrentCluster] = useState<
    (ClusterWithContest & {
      hasAnyTeamAdvancedByContest?: { [key: number]: boolean };
    }) | null
  >(null);

  const [hasLoaded, setHasLoaded] = useState(false);

  // Track if this is the first time loading data for this judge
  const isInitialLoadRef = useRef(true);

  // Track last judge id to decide when to refetch vs reuse cached data
  const lastLoadedJudgeIdRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // UI animation effects (fade-in once data has settled)
  // ---------------------------------------------------------------------------

  // Tiny fade for the whole page whenever data settles
  useEffect(() => {
    if (!hasLoaded) return;

    // Reset first so the browser sees opacity: 0
    setFadeIn(false);

    const t = setTimeout(() => {
      setFadeIn(true);
    }, 10); // small delay so the transition kicks in

    return () => clearTimeout(t);
  }, [hasLoaded, teams.length]);

  // ---------------------------------------------------------------------------
  // Initial scoresheet mappings for judge
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!judge?.id) return;

    const hasMappingsForJudge =
      Object.keys(mappings).length > 0 &&
      Object.keys(mappings).some((key) => key.includes(`-${judge.id}-`));

    // First visit or after hard refresh → fetch mappings
    if (!hasMappingsForJudge) {
      fetchScoreSheetsByJudge(judge.id);
    }
  }, [judge?.id, mappings, fetchScoreSheetsByJudge]);

  // ---------------------------------------------------------------------------
  // Core data loader: clusters, teams, contests, advancement status
  // ---------------------------------------------------------------------------

  /*
   * Fetches all clusters and teams for a judge.
   * - Fetches clusters for the judge
   * - Filters to active contests (if contests are loaded)
   * - Determines championship assignments and team advancement status
   * - Hydrates mapContestToTeam store (team → contest)
   * - Selects a current cluster (prefers championship/redesign when applicable)
   * - Triggers tabulation for championship contests when needed
   */
  const fetchAllClustersForJudge = useCallback(
    async (judgeId: number, forceRefresh: boolean = false) => {
      try {
        // Ensure contests are available (used for filtering and tabulation)
        const contestStore = useContestStore.getState();
        if (contestStore.allContests.length === 0) {
          contestStore.fetchAllContests().catch(() => {
            // Silently fail - will show all clusters if contests aren't available
          });
        }

        // Fetch all clusters for this judge
        const [allClusters] = await Promise.all([
          fetchAllClustersByJudgeId(judgeId, forceRefresh)
        ]);

        if (allClusters && allClusters.length > 0) {
          const allContests = useContestStore.getState().allContests;

          // Active contest ids used to filter clusters when contests exist
          const activeContestIds = new Set(
            allContests.map((c: Contest) => c.id)
          );

          // Filter clusters to show only active contests (or all if contests not yet loaded)
          const clustersToShow = allClusters.filter(
            (cluster: ClusterWithContest) => {
              if (allContests.length === 0) {
                return true;
              }
              return (
                !cluster.contest_id || activeContestIds.has(cluster.contest_id)
              );
            }
          );

          /**
           * Determines if judge has championship assignment in each contest.
           * Used to disable preliminary scoresheets when judge has championship assignment.
           */
          const judgeHasChampionshipAssignmentByContest = new Map<
            number,
            boolean
          >();

          clustersToShow.forEach((cluster: ClusterWithContest) => {
            if (cluster.contest_id) {
              const hasChampionship =
                cluster.sheet_flags?.championship === true ||
                cluster.cluster_type === "championship" ||
                cluster.cluster_name?.toLowerCase().includes("championship");

              const currentValue =
                judgeHasChampionshipAssignmentByContest.get(
                  cluster.contest_id
                ) || false;

              judgeHasChampionshipAssignmentByContest.set(
                cluster.contest_id,
                currentValue || hasChampionship
              );
            }
          });

          // -------------------------------------------------------------------
          // Fetch teams per cluster and deduplicate across clusters
          // -------------------------------------------------------------------

          const teamPromises = clustersToShow.map((cluster) =>
            fetchTeamsByClusterId(cluster.id).catch(() => [])
          );
          const teamsArrays = await Promise.all(teamPromises);
          const allTeamsForJudge = teamsArrays.flat();

          // Deduplicate teams
          const uniqueTeams = allTeamsForJudge.filter(
            (team, index, self) =>
              index === self.findIndex((t) => t.id === team.id)
          );

          // Normalize advanced_to_championship so it's always boolean
          const processedTeams = uniqueTeams.map((t: Team) => ({
            ...t,
            advanced_to_championship: t.advanced_to_championship ?? false
          }));

          // -------------------------------------------------------------------
          // Build contest map and team → contest mapping
          // -------------------------------------------------------------------

          const contestById: Record<number, Contest> = {};
          allContests.forEach((c: Contest) => {
            contestById[c.id] = c;
          });

          const contestsForTeamsMap: { [key: number]: Contest | null } = {};

          clustersToShow.forEach((cluster: ClusterWithContest, idx: number) => {
            const contestId = cluster.contest_id;
            if (!contestId) return;

            const contest = contestById[contestId] || null;
            const clusterTeams = teamsArrays[idx] || [];

            clusterTeams.forEach((team: Team) => {
              contestsForTeamsMap[team.id] = contest;
            });
          });

          // Hydrate mapContestToTeam store BEFORE setting teams
          setContestsForTeams(contestsForTeamsMap);

          // Now update local teams state
          setTeams(processedTeams as Team[]);
          isInitialLoadRef.current = false;

          // -------------------------------------------------------------------
          // Fetch all teams in each contest to see if any have advanced
          // -------------------------------------------------------------------

          const contestIds = new Set<number>();
          clustersToShow.forEach((cluster: ClusterWithContest) => {
            if (cluster.contest_id) {
              contestIds.add(cluster.contest_id);
            }
          });

          const allTeamsByContest: { [contestId: number]: Team[] } = {};

          await Promise.all(
            Array.from(contestIds).map(async (contestId: number) => {
              try {
                const response = await api.get<Team[]>(
                  `/api/mapping/teamToContest/getTeamsByContest/${contestId}/`
                );
                allTeamsByContest[contestId] = response.data || [];
              } catch (error) {
                console.error(
                  `[Judging] Error fetching teams for contest ${contestId}:`,
                  error
                );
                allTeamsByContest[contestId] = [];
              }
            })
          );

          const hasAnyTeamAdvancedByContest = new Map<number, boolean>();
          Object.keys(allTeamsByContest).forEach((contestIdStr) => {
            const contestId = parseInt(contestIdStr, 10);
            const contestTeams = allTeamsByContest[contestId] || [];
            const hasAdvanced = contestTeams.some(
              (team: Team) => team.advanced_to_championship === true
            );
            hasAnyTeamAdvancedByContest.set(contestId, hasAdvanced);
          });

          // -------------------------------------------------------------------
          // Determine which cluster to display by default
          // Prefer championship/redesign clusters when teams have advanced
          // -------------------------------------------------------------------

          let currentClusterToSet: (ClusterWithContest & {
            judgeHasChampionshipByContest?: { [key: number]: boolean };
            hasAnyTeamAdvancedByContest?: { [key: number]: boolean };
          }) | null = null;

          const championshipOrRedesignClusters = clustersToShow.filter(
            (cluster: ClusterWithContest) => {
              const isChampOrRedesign =
                cluster.cluster_type === "championship" ||
                cluster.cluster_type === "redesign" ||
                cluster.cluster_name?.toLowerCase().includes("championship") ||
                cluster.cluster_name?.toLowerCase().includes("redesign");

              if (isChampOrRedesign && cluster.contest_id) {
                return (
                  hasAnyTeamAdvancedByContest.get(cluster.contest_id) === true
                );
              }
              return false;
            }
          );

          if (championshipOrRedesignClusters.length > 0) {
            // Prefer a championship/redesign cluster when available
            currentClusterToSet = { ...championshipOrRedesignClusters[0] };
          } else {
            // Fallback to first cluster
            currentClusterToSet = clustersToShow[0]
              ? { ...clustersToShow[0] }
              : null;
          }

          // Attach plain objects for JudgeDashboardTable props
          if (currentClusterToSet) {
            const championshipByContestObj: { [key: number]: boolean } = {};
            judgeHasChampionshipAssignmentByContest.forEach((value, key) => {
              championshipByContestObj[key] = value;
            });
            currentClusterToSet.judgeHasChampionshipByContest =
              championshipByContestObj;

            const hasAdvancedByContestObj: { [key: number]: boolean } = {};
            hasAnyTeamAdvancedByContest.forEach((value, key) => {
              hasAdvancedByContestObj[key] = value;
            });
            currentClusterToSet.hasAnyTeamAdvancedByContest =
              hasAdvancedByContestObj;
          }

          setCurrentCluster(currentClusterToSet);

          // -------------------------------------------------------------------
          // Championship / redesign tabulation
          // -------------------------------------------------------------------

          const championshipClusters = clustersToShow.filter(
            (cluster: ClusterWithContest) =>
              cluster.cluster_type === "championship" ||
              cluster.cluster_type === "redesign" ||
              cluster.cluster_name?.toLowerCase().includes("championship") ||
              cluster.cluster_name?.toLowerCase().includes("redesign")
          );

          if (championshipClusters.length > 0 && uniqueTeams.length > 0) {
            const contestId = currentClusterToSet?.contest_id;
            if (contestId) {
              api
                .put(`/api/tabulation/tabulateScores/`, {
                  contestid: contestId
                })
                .catch((error) => {
                  console.error("Tabulation failed:", error);
                });
            }
          }

          setHasLoaded(true);
        } else {
          // No clusters found for judge
          setTeams([]);
          isInitialLoadRef.current = false;
          setHasLoaded(true);
        }
      } catch (error) {
        console.error("Error fetching teams/clusters for judge:", error);
        setTeams([]);
        isInitialLoadRef.current = false;
        setHasLoaded(true);
      }
    },
    [fetchAllClustersByJudgeId, setContestsForTeams]
  );

  // ---------------------------------------------------------------------------
  // High-level loader: reacts to judgeId changes and cache / refetch logic
  // ---------------------------------------------------------------------------

  /**
   * Loads judge data and teams.
   *
   * Behavior:
   * - On judgeId change: clear local state, clear cached judge, refetch clusters + judge.
   * - If navigating back and we have cached teams in store: hydrate from cache.
   * - If teams already loaded: just mark as loaded.
   * - As a fallback, refetch judge + clusters if not loaded and no teams.
   */
  useEffect(() => {
    if (!judgeIdNumber) return;

    const judgeIdChanged = lastLoadedJudgeIdRef.current !== judgeIdNumber;

    if (judgeIdChanged) {
      // New judge → reset state and fetch fresh data
      setTeams([]);
      setHasLoaded(false);
      isInitialLoadRef.current = true;
      lastLoadedJudgeIdRef.current = judgeIdNumber;

      // Clear cached judge data to ensure fresh fetch
      const { clearJudge } = useJudgeStore.getState();
      clearJudge();

      fetchJudgeById(judgeIdNumber);
      fetchAllClustersForJudge(judgeIdNumber);
    } else {
      // Same judge: try to hydrate from cached teams in store
      const hasCachedTeams = Object.values(teamsByClusterId).some(
        (clusterTeams) => clusterTeams && clusterTeams.length > 0
      );

      if (hasCachedTeams && teams.length === 0) {
        const allCachedTeams = Object.values(teamsByClusterId).flat();
        const uniqueTeams = allCachedTeams.filter(
          (team, index, self) =>
            index === self.findIndex((t) => t.id === team.id)
        );
        setTeams(uniqueTeams as Team[]);
        setHasLoaded(true);
        isInitialLoadRef.current = false;
      } else if (teams.length > 0) {
        // Teams already in local state, just mark as loaded if needed
        if (!hasLoaded) {
          setHasLoaded(true);
          isInitialLoadRef.current = false;
        }
      } else if (!hasLoaded) {
        // Nothing cached and not loaded yet → fetch
        fetchJudgeById(judgeIdNumber);
        fetchAllClustersForJudge(judgeIdNumber);
      }
    }
  }, [
    judgeIdNumber,
    teams.length,
    hasLoaded,
    teamsByClusterId,
    fetchJudgeById,
    fetchAllClustersForJudge
  ]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  /**
   * Clean up contests mapping on unmount.
   */
  useEffect(() => {
    return () => {
      clearContests();
    };
  }, [clearContests]);

  // ---------------------------------------------------------------------------
  // Global data change listeners (contest/team/judge/scoresheet/cluster)
  // ---------------------------------------------------------------------------

  /**
   * Listens for data changes that affect the judge dashboard.
   * Refreshes data when contests, teams, judges, scoresheets, or clusters change.
   * Also listens for 'championshipUndone' event to fully refresh judge context.
   */
  useEffect(() => {
    const handleDataChange = async (event: DataChangeEvent) => {
      if (!judgeIdNumber) return;

      if (event.type === "contest" && event.action === "delete") {
        // Contest deleted → clear teams and refetch everything
        setTeams([]);
        setHasLoaded(false);
        isInitialLoadRef.current = true;
        await fetchAllClustersForJudge(judgeIdNumber, true);
      } else if (
        event.type === "team" &&
        (event.action === "create" ||
          event.action === "update" ||
          event.action === "delete")
      ) {
        if (event.action === "create" || event.action === "delete") {
          // Team added/removed → refetch clusters/teams
          setTeams([]);
          setHasLoaded(false);
          isInitialLoadRef.current = true;
          await fetchAllClustersForJudge(judgeIdNumber);
        } else if (event.action === "update") {
          // Team updated → refresh judge & scoresheet mappings
          await fetchJudgeById(judgeIdNumber);

          setTimeout(() => {
            const { fetchScoreSheetsByJudge } =
              useMapScoreSheetStore.getState();
            fetchScoreSheetsByJudge(judgeIdNumber);
          }, 100);
        }
      } else if (
        event.type === "judge" &&
        event.action === "delete" &&
        event.judgeId === judgeIdNumber &&
        event.clusterId
      ) {
        // Judge removed from cluster → refresh clusters/teams
        setTeams([]);
        setHasLoaded(false);
        isInitialLoadRef.current = true;
        await fetchAllClustersForJudge(judgeIdNumber, true);
      } else if (
        event.type === "judge" &&
        event.action === "update" &&
        event.judgeId === judgeIdNumber
      ) {
        // Judge updated → just refresh judge object
        await fetchJudgeById(judgeIdNumber);
      } else if (
        event.type === "scoresheet" &&
        (event.action === "create" ||
          event.action === "update" ||
          event.action === "delete")
      ) {
        // Any scoresheet change → refresh judge and scoresheet mappings
        await fetchJudgeById(judgeIdNumber);

        setTimeout(() => {
          const { fetchScoreSheetsByJudge } =
            useMapScoreSheetStore.getState();
          fetchScoreSheetsByJudge(judgeIdNumber);
        }, 100);
      } else if (
        event.type === "cluster" &&
        (event.action === "create" ||
          event.action === "update" ||
          event.action === "delete")
      ) {
        // Cluster mutations → clear local teams and refetch everything
        setTeams([]);
        setHasLoaded(false);
        isInitialLoadRef.current = true;

        await fetchAllClustersForJudge(judgeIdNumber, true);
        await fetchJudgeById(judgeIdNumber);
      }
    };

    const unsubscribeDataChange = onDataChange(handleDataChange);

    /**
     * Special handler for when a championship is undone.
     * Clears team view, contest mapping, scoresheet mapping, and reloads judge context.
     */
    const handleChampionshipUndo = async () => {
      if (!judgeIdNumber) return;

      // Clear team view + contest mapping + scoresheet mapping
      setTeams([]);
      setHasLoaded(false);
      isInitialLoadRef.current = true;

      // Clear contest cache used for contestsForTeams
      clearContests();

      // Clear and refetch scoresheet mappings for this judge
      clearMappings();
      await Promise.all([
        fetchAllClustersForJudge(judgeIdNumber, true),
        fetchScoreSheetsByJudge(judgeIdNumber),
        fetchJudgeById(judgeIdNumber)
      ]);
    };

    window.addEventListener("championshipUndone", handleChampionshipUndo);

    return () => {
      unsubscribeDataChange();
      window.removeEventListener("championshipUndone", handleChampionshipUndo);
    };
  }, [
    judgeIdNumber,
    fetchAllClustersForJudge,
    fetchJudgeById,
    clearMappings,
    fetchScoreSheetsByJudge,
    clearContests
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box
      sx={{
        pb: 8,
        backgroundColor: "#fafafa",
        minHeight: "100vh",
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      {/* Back to admin dashboard (only for admin / superuser roles) */}
      {(role?.user_type === 1 || role?.user_type === 2) && (
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 1, sm: 2 },
            mt: { xs: 1, sm: 2 }
          }}
        >
          <Button
            onClick={() => navigate(-1)}
            startIcon={<ArrowBackIcon />}
            sx={{
              textTransform: "none",
              color: theme.palette.success.dark,
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
              fontWeight: 500,
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              borderRadius: "8px",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(76, 175, 80, 0.08)",
                transform: "translateX(-2px)"
              }
            }}
          >
            Back to Dashboard
          </Button>
        </Container>
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        {mapClusterToTeamError ? (
          // -----------------------------------------------------------------
          // Error state
          // -----------------------------------------------------------------
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px"
            }}
          >
            <Typography variant="h6" color="error">
              Error loading judge dashboard. Please refresh the page.
            </Typography>
          </Box>
        ) : (
          // -----------------------------------------------------------------
          // Main dashboard content
          // -----------------------------------------------------------------
          <Box>
            {/* Header: Title + Judge name */}
            <Stack spacing={1} sx={{ mb: 2, mt: 2 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 400,
                  color: theme.palette.success.main,
                  fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.5rem" },
                  fontFamily: '"DM Serif Display", "Georgia", serif',
                  letterSpacing: "0.02em",
                  lineHeight: 1.2
                }}
              >
                Judge Dashboard
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
              >
                {judge?.first_name} {judge?.last_name}
              </Typography>
            </Stack>

            {/* Stats row */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard value={visibleTeamsCount} label="Teams Assigned" />
              </Grid>
            </Grid>

            {/* Teams overview table */}
            <Box
              sx={{
                border: `1px solid ${theme.palette.grey[300]}`,
                borderRadius: 3,
                backgroundColor: "#fff"
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  backgroundColor: "rgba(46, 125, 50, 0.06)"
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Team Overview
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ px: 3, pb: 2 }}>
                {teams.length > 0 ? (
                  <React.Suspense fallback={
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        Loading dashboard...
                      </Typography>
                    </Box>
                  }>
                    <JudgeDashboardTable
                      teams={teams}
                      currentCluster={currentCluster}
                      onVisibleTeamsChange={setVisibleTeamsCount}
                    />
                  </React.Suspense>
                ) : hasLoaded ? (
                  // No teams for this judge
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      No teams available for this judge.
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Please contact the organizer if you believe this is an
                      error.
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
})
