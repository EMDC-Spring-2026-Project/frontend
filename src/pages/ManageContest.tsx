// ==============================
// Component: ManageContest
// Handles judges, teams, clusters, and contest configuration with tabbed navigation.
// ==============================

// ==============================
// React Core
// ==============================
import { useEffect, useMemo, useState, useRef } from "react";

// ==============================
// Router
// ==============================
import { useParams, Link as RouterLink } from "react-router-dom";

// ==============================
// UI Libraries & Theme
// ==============================
import {
  Box,
  Button,
  Container,
  Tab,
  Tooltip,	
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import theme from "../theme";

// ==============================
// Store Hooks
// ==============================
import { useAuthStore } from "../store/primary_stores/authStore";
import { useContestStore } from "../store/primary_stores/contestStore";
import { useMapClusterToContestStore } from "../store/map_stores/mapClusterToContestStore";
import useContestJudgeStore from "../store/map_stores/mapContestToJudgeStore";
import { useMapClusterJudgeStore } from "../store/map_stores/mapClusterToJudgeStore";
import { useMapCoachToTeamStore } from "../store/map_stores/mapCoachToTeamStore";
import useMapClusterTeamStore from "../store/map_stores/mapClusterToTeamStore";

// ==============================
// Local Components
// ==============================
import OrganizerJudgesTable from "../components/Tables/OrganizerJudgesTable";
import OrganizerTeamsTable from "../components/Tables/OrganizerTeamsTable";
import JudgeModal from "../components/Modals/JudgeModal";
import ClusterModal from "../components/Modals/ClusterModal";
import TeamModal from "../components/Modals/TeamModal";
import AssignJudgeToContestModal from "../components/Modals/AssignJudgeToContestModal";

// ==============================
// Constants & Utilities
// ==============================

const ACTIVE_TAB_COOKIE = "manageContestActiveTab";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Cookie utility functions for tab persistence
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAgeSeconds};samesite=lax`;
}

export default function ManageContest() {
  // ------------------------------
  // Route Parameters
  // ------------------------------
  const { contestId } = useParams();
  const parsedContestId = contestId ? parseInt(contestId, 10) : 0;

  // ------------------------------
  // Authentication
  // ------------------------------
  const { role } = useAuthStore();

  // ------------------------------
  // Local UI State
  // ------------------------------
  const [value, setValue] = useState(() => getCookie(ACTIVE_TAB_COOKIE) || "1");
  const [hasLoaded, setHasLoaded] = useState(false);
  const isInitialLoadRef = useRef(true);

  // Modal state management for different creation/editing operations
  const [openJudgeModal, setOpenJudgeModal] = useState(false);
  const [openClusterModal, setOpenClusterModal] = useState(false);
  const [openTeamModal, setOpenTeamModal] = useState(false);
  const [openAssignJudgeModal, setOpenAssignJudgeModal] = useState(false);

  // ------------------------------
  // Store State & Actions
  // ------------------------------

  // Contest data management - use selector to subscribe to contest updates
  const contest = useContestStore((state) => state.contest);
  const fetchContestById = useContestStore((state) => state.fetchContestById);

  const { getAllJudgesByContestId } = useContestJudgeStore();
  const { clusters, fetchClustersByContestId } = useMapClusterToContestStore();
  const { fetchTeamsByClusterId, teamsByClusterId } = useMapClusterTeamStore();

  // Judge-cluster mapping for organizing judges by clusters
  const { fetchJudgesByClusterId, judgesByClusterId } = useMapClusterJudgeStore();

  // Coach data management for teams
  const { fetchCoachesByTeams } = useMapCoachToTeamStore();

  // ==============================
  // Refs & State Tracking
  // ==============================

  // Track which clusters have been fetched to prevent duplicate calls
  const fetchedClustersRef = useRef<Set<number>>(new Set());

  // ==============================
  // Computed Values
  // ==============================

  // Create sorted cluster IDs string for dependency tracking
  const clusterIds = useMemo(
    () => clusters.map(c => c.id).sort((a, b) => a - b).join(','),
    [clusters]
  );

  // ==============================
  // Refs & State Tracking
  // ==============================

  // Track last fetched contest ID to prevent refetching on same contest
  const lastFetchedContestIdRef = useRef<number | null>(null);

  // ==============================
  // Data Loading & Effects
  // ==============================

  // Main data loading effect for contest, clusters, judges, teams, and coaches
  useEffect(() => {
    if (!parsedContestId) {
      setHasLoaded(true);
      isInitialLoadRef.current = false;
      lastFetchedContestIdRef.current = null;
      return;
    }

    // Only fetch if contest ID changed
    if (lastFetchedContestIdRef.current === parsedContestId) {
      return;
    }

    lastFetchedContestIdRef.current = parsedContestId;
    setHasLoaded(false);
    Promise.all([
      fetchContestById(parsedContestId),
      getAllJudgesByContestId(parsedContestId),
      fetchClustersByContestId(parsedContestId)
    ]).then(() => {
      setHasLoaded(true);
      isInitialLoadRef.current = false;
    }).catch((error) => {
      console.error(error);
      setHasLoaded(true);
      isInitialLoadRef.current = false;
    });
  }, [parsedContestId, fetchContestById, getAllJudgesByContestId, fetchClustersByContestId]);

  /**
   * Fetches teams and judges for clusters that don't have cached data.
   * Only fetches for clusters that haven't been loaded yet to avoid unnecessary API calls.
   */
  useEffect(() => {
    if (!clusters.length) {
      fetchedClustersRef.current.clear();
      return;
    }

    const currentClusterIds = new Set(clusters.map(c => c.id));
    
    // Remove clusters that no longer exist
    fetchedClustersRef.current.forEach(clusterId => {
      if (!currentClusterIds.has(clusterId)) {
        fetchedClustersRef.current.delete(clusterId);
      }
    });

    const clustersToFetchTeams = clusters.filter(c => {
      const hasCached = teamsByClusterId[c.id]?.length > 0;
      const alreadyFetched = fetchedClustersRef.current.has(c.id);
      return !hasCached && !alreadyFetched;
    });

    const clustersToFetchJudges = clusters.filter(c => {
      const hasCached = judgesByClusterId[c.id]?.length > 0;
      const alreadyFetched = fetchedClustersRef.current.has(c.id);
      return !hasCached && !alreadyFetched;
    });

    if (clustersToFetchTeams.length === 0 && clustersToFetchJudges.length === 0) return;

    // Mark clusters as being fetched
    clustersToFetchTeams.forEach(c => fetchedClustersRef.current.add(c.id));
    clustersToFetchJudges.forEach(c => fetchedClustersRef.current.add(c.id));

    Promise.all([
      ...clustersToFetchTeams.map(c => fetchTeamsByClusterId(c.id)),
      ...clustersToFetchJudges.map(c => fetchJudgesByClusterId(c.id))
    ]).catch(console.error);
  }, [clusterIds, teamsByClusterId, judgesByClusterId, fetchTeamsByClusterId, fetchJudgesByClusterId]);

  /**
   * Aggregates all teams from all clusters into a single array.
   * Used for loading coach data when teams tab is active.
   */
  const allTeams = useMemo(() => {
    return clusters.flatMap(c => teamsByClusterId[c.id] ?? []);
  }, [clusterIds, teamsByClusterId, clusters]);

  // Memoize team IDs to prevent unnecessary re-fetches
  const teamIdsString = useMemo(() => {
    return allTeams.map(t => t.id).sort((a, b) => a - b).join(',');
  }, [allTeams]);

  const isTeamsTab = value === "2";
  const lastFetchedTeamIdsRef = useRef<string>("");
  const lastFetchedTabRef = useRef<string>("");

  /**
   * Loads coach data when teams tab is active and teams are available.
   * Only fetches coaches when needed to optimize performance.
   */
  useEffect(() => {
    if (!isTeamsTab || allTeams.length === 0) {
      lastFetchedTabRef.current = "";
      return;
    }

    // Only fetch if tab changed to teams or team IDs changed
    const shouldFetch = 
      lastFetchedTabRef.current !== "2" || 
      lastFetchedTeamIdsRef.current !== teamIdsString;

    if (!shouldFetch) return;

    lastFetchedTabRef.current = "2";
    lastFetchedTeamIdsRef.current = teamIdsString;
    fetchCoachesByTeams(allTeams).catch(console.error);
  }, [isTeamsTab, teamIdsString, allTeams, fetchCoachesByTeams]);



  const hasClusters = clusters.length > 0;
  const hasTeams = clusters.some(
    (cluster) => teamsByClusterId[cluster.id]?.length > 0
  );


  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
    setCookie(ACTIVE_TAB_COOKIE, newValue, COOKIE_MAX_AGE_SECONDS);
  };


  // ==============================
  // Main Component Render
  // ==============================

  return (
  <>
    {/* ==============================
        Page Header & Navigation
        ============================== */}
    <Container
      sx={{
        maxWidth: 1200,
        width: "100%",
        mx: "auto",
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Back to Dashboard */}
      <Box sx={{ mb: 1, mt: { xs: 1, sm: 2 } }}>
        {role?.user_type === 2 && (
          <Button
            component={RouterLink}
            to="/organizer"
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
                transform: "translateX(-2px)",
              },
            }}
          >
            Back to Dashboard
          </Button>
        )}
        {role?.user_type === 1 && (
          <Button
            component={RouterLink}
            to="/admin"
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
                transform: "translateX(-2px)",
              },
            }}
          >
            Back to Dashboard
          </Button>
        )}
      </Box>

      {/* Page Title */}
      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 400,
          mt: 2,
          mb: 2,
          color: theme.palette.primary.main,
          fontFamily: '"DM Serif Display", "Georgia", serif',
          fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
          letterSpacing: "0.02em",
          lineHeight: 1.2,
        }}
      >
        Manage {contest?.name}
      </Typography>
    </Container>
    

    {/* Main Container */}
    <Container
      sx={{
        maxWidth: 1200,
        width: "100%",
        mx: "auto",
        mt: 1,
        mb: 2,
        p: 3,
        bgcolor: theme.palette.background.paper,
        borderRadius: 3,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: `1px solid ${theme.palette.divider}`,
        contain: "layout style",
        overflowAnchor: "none",
        position: "relative",
        isolation: "isolate",
      }}
    >
      <Box
        sx={{
          opacity: hasLoaded ? 1 : 0,
          transition: hasLoaded ? `opacity ${isInitialLoadRef.current ? '0.6s' : '0.1s'} ease-in` : 'none',
          pointerEvents: hasLoaded ? 'auto' : 'none',
        }}
      >
      {/* Action Buttons */}
{!contest?.is_open && (
  <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
    <Tooltip title={!hasClusters ? "Create a cluster first" : !hasTeams ? "Create a team first" : ""}>
      <span>
    <Button
      variant="contained"
      onClick={() => setOpenJudgeModal(true)}
      disabled={!hasClusters || !hasTeams}
      sx={{
        textTransform: "none",
        borderRadius: 2,
        px: 4.5,
        fontWeight: 600,
        bgcolor: theme.palette.success.main,
        color: theme.palette.common.white,
        "&:hover": { bgcolor: theme.palette.success.dark },
        "&.Mui-disabled": {
          bgcolor: theme.palette.action.disabledBackground,
          color: theme.palette.action.disabled,
        },
      }}
    >
      Create Judge
    </Button>
  </span>
  </Tooltip>

    <Button
      variant="outlined"
      onClick={() => setOpenClusterModal(true)}
      sx={{
        textTransform: "none",
        borderRadius: 2,
        px: 4.5,
        fontWeight: 600,
        borderColor: theme.palette.success.main,
        color: theme.palette.success.main,
        "&:hover": {
          borderColor: theme.palette.success.dark,
          backgroundColor: "rgba(46,125,50,0.06)", 
        },
      }}
    >
      Create Cluster
    </Button>

    <Button
      variant="outlined"
      onClick={() => setOpenTeamModal(true)}
      disabled={!hasClusters}
      sx={{
        textTransform: "none",
        borderRadius: 2,
        px: 4.5,
        fontWeight: 600,
        borderColor: theme.palette.success.main,
        color: theme.palette.success.main,
        "&:hover": {
          borderColor: theme.palette.success.dark,
          backgroundColor: "rgba(46,125,50,0.06)",
        },
        "&.Mui-disabled": {
          borderColor: theme.palette.action.disabledBackground,
          color: theme.palette.action.disabled,
        },
      }}
    >
      Create Team
    </Button>

    <Button
      variant="outlined"
      onClick={() => {
        setOpenAssignJudgeModal(true);
      }}
      disabled={!hasClusters}
      sx={{
        textTransform: "none",
        borderRadius: 2,
        px: 4.5,
        fontWeight: 600,
        borderColor: theme.palette.success.main,
        color: theme.palette.success.main,
        "&:hover": {
          borderColor: theme.palette.success.dark,
          backgroundColor: "rgba(46,125,50,0.06)",
        },
        "&.Mui-disabled": {
          borderColor: theme.palette.action.disabledBackground,
          color: theme.palette.action.disabled,
        },
      }}
    >
      Assign Judge to Contest
    </Button>
  </Box>
)}


      {/* Tabs */}
      <TabContext value={value}>
        <Box
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <TabList
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            TabIndicatorProps={{
              style: {
                backgroundColor: theme.palette.primary.main,
                height: 3,
                borderRadius: 2,
              },
            }}
            sx={{
              "& .MuiTabs-scrollButtons": {
                color: theme.palette.primary.main,
              },
            }}
          >
            <Tab
              label="Judges"
              value="1"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                "&.Mui-selected": { color: theme.palette.primary.main },
              }}
            />
            <Tab
              label="Teams"
              value="2"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                "&.Mui-selected": { color: theme.palette.primary.main },
              }}
            />
          </TabList>
        </Box>

        {/* Judges Tab */}
        <TabPanel
          value="1"
          sx={{
            bgcolor: "#f9f9f9",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            border: `1px solid ${theme.palette.divider}`,
            borderTop: "none",
            overflowAnchor: "none",
            position: "relative",
            minHeight: 200,
          }}
        >
          <OrganizerJudgesTable
            clusters={clusters}
            judgesByClusterId={judgesByClusterId}
            contestid={parsedContestId}
          />
        </TabPanel>

        {/* Teams Tab */}
        <TabPanel
          value="2"
          sx={{
            bgcolor: theme.palette.common.white,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            border: `1px solid ${theme.palette.divider}`,
            borderTop: "none",
            overflowAnchor: "none",
            position: "relative",
            minHeight: 200,
          }}
        >
          {isTeamsTab && (
            <OrganizerTeamsTable
              clusters={clusters}
              contestId={parsedContestId ?? 0}
            />
          )}
        </TabPanel>
      </TabContext>
      </Box>
    </Container>

    {/* Modals */}
    <JudgeModal
      open={openJudgeModal}
      handleClose={() => setOpenJudgeModal(false)}
      mode="new"
      clusters={clusters}
      contestid={parsedContestId}
      onSuccess={async () => {
        // Refresh judges after creating/editing
        if (parsedContestId) {
          await getAllJudgesByContestId(parsedContestId, true);
          // Refresh judges for all clusters
          if (clusters.length > 0) {
            await Promise.all(
              clusters.map(cluster => fetchJudgesByClusterId(cluster.id, true))
            );
          }
        }
        setOpenJudgeModal(false);
      }}
    />
    <ClusterModal
      open={openClusterModal}
      handleClose={() => setOpenClusterModal(false)}
      mode="new"
      contestid={parsedContestId}
      onSuccess={() => {
        if (parsedContestId) {
          fetchClustersByContestId(parsedContestId).catch(console.error);
        }
        setOpenClusterModal(false);
      }}
    />
    <TeamModal
      open={openTeamModal}
      handleClose={() => setOpenTeamModal(false)}
      mode="new"
      clusters={clusters}
      contestId={parsedContestId}
      onSuccess={() => {
        if (clusters.length > 0) {
          Promise.all(
            clusters.map(cluster => fetchTeamsByClusterId(cluster.id))
          ).catch(console.error);
        }
        setOpenTeamModal(false);
      }}
    />
    <AssignJudgeToContestModal
      open={openAssignJudgeModal}
      contestId={parsedContestId}
      handleClose={() => {
        setOpenAssignJudgeModal(false);
      }}
      onSuccess={async () => {
        // Refresh judges after assigning to contest
        if (parsedContestId) {
          // Refresh all contest judges
          await getAllJudgesByContestId(parsedContestId, true);
          // Refresh judges for all clusters in the contest
          if (clusters.length > 0) {
            await Promise.all(
              clusters.map(cluster => fetchJudgesByClusterId(cluster.id, true))
            );
          }
        }
        setOpenAssignJudgeModal(false);
      }}
    />
  </>
);
}