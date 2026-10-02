

// ==============================
// Component: Rankings
// Advanced rankings table with championship advancement controls.
// Features expandable team details, bulk selection, and live scoring status.
// ==============================

// ==============================
// React Core
// ==============================
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";

// ==============================
// Router
// ==============================
import { useNavigate } from "react-router-dom";

// ==============================
// UI Libraries & Theme
// ==============================
import {
  Button,
  Box,
  Checkbox,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  Chip,
} from "@mui/material";
import theme from "../../theme";
import { TriangleIcon, Trophy } from "lucide-react";
import toast from "react-hot-toast";

// ==============================
// Store Hooks
// ==============================
import { useAuthStore } from "../../store/primary_stores/authStore";
import { useRankingsStore } from "../../store/primary_stores/rankingsStore";

// ==============================
// API & Utilities
// ==============================
import { api } from "../../lib/api";
import { onDataChange, DataChangeEvent } from "../../utils/dataChangeEvents";

// ==============================
// Local Components
// ==============================
import GreenDotsPreloader from "../GreenDotsPreloader";

// ==============================
// Types & Interfaces
// ==============================

type ContestType = "preliminary" | "championship" | "redesign" | string;
type TeamStatus = "completed" | "in_progress" | "not_started";

interface RankedTeam {
  id: number;
  team_name: string;
  school_name: string;
  total_score: number;
  advanced_to_championship: boolean;
  cluster_rank: number;
  status: TeamStatus;
}

interface ClusterEntry {
  id: number;
  cluster_name: string;
  cluster_type: ContestType;
  teams: RankedTeam[];
  _statusFetched?: boolean;
}

interface CacheEntry {
  timestamp: number;
  clusters: ClusterEntry[];
}

interface ClusterRowProps {
  cluster: ClusterEntry;
  isOpen: boolean;
  selectedTeams: number[];
  selectedContest: { id: number } | null;
  onToggle: (id: number) => void;
  onSelect: (teamId: number) => void;
  onNavigate: (path: string, state: any) => void;
}

// ========== ClusterRow (memoized) ==========
const ClusterRow = memo(function ClusterRow({
  cluster,
  isOpen,
  selectedTeams,
  selectedContest,
  onToggle,
  onSelect,
  onNavigate,
}: ClusterRowProps) {
  const teams = cluster.teams ?? [];
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        mb: 2.5,
        maxWidth: "100%",
        width: "100%",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.06)}`,
          borderColor: alpha(theme.palette.success.main, 0.25),
        },
      }}
    >
      {/* Cluster Header */}
      <Box
        sx={{
          background: alpha(theme.palette.grey[100], 0.6),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          cursor: "pointer",
          transition: "background 0.15s ease",
          "&:hover": {
            background: alpha(theme.palette.grey[100], 0.9),
          },
        }}
        onClick={() => onToggle(cluster.id)}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: 0,
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
              flex: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(cluster.id);
              }}
              sx={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.25s ease",
                p: { xs: 0.75, sm: 1 },
                flexShrink: 0,
              }}
            >
              <TriangleIcon
                color={theme.palette.success.main}
                fill="none"
                size={16}
                strokeWidth={2.5}
              />
            </IconButton>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.9rem", sm: "1.05rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: 1,
                color: theme.palette.text.primary,
              }}
            >
              {cluster.cluster_name}
            </Typography>
          </Box>
          <Chip
            label={`${teams.length} Teams`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "0.7rem", sm: "0.75rem" },
              bgcolor: "white",
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              color: theme.palette.success.main,
              "& .MuiChip-label": {
                px: 1.5,
              },
            }}
          />
        </Box>
      </Box>
      {/* Cluster Table */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <TableContainer sx={{ overflow: "auto", maxWidth: "100%", bgcolor: "white" }}>
          <Table sx={{ minWidth: { xs: 400, sm: 650 } }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.grey[50], 0.8),
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 0.75, sm: 1.5 },
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  },
                }}
              >
                <TableCell align="center" sx={{ width: 60 }}>Select</TableCell>
                <TableCell align="center" sx={{ width: 80 }}>Rank</TableCell>
                <TableCell align="left">Team Name</TableCell>
                <TableCell align="left">School</TableCell>
                <TableCell align="center" sx={{ width: 100 }}>Score</TableCell>
                <TableCell align="center" sx={{ width: 120 }}>Status</TableCell>
                <TableCell align="right" sx={{ width: 130 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team: any) => (
                <TableRow
                  key={team.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.success.main, 0.03),
                    },
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    "& .MuiTableCell-root": {
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: { xs: 1.25, sm: 1.75 },
                      px: { xs: 0.75, sm: 1.5 },
                    },
                  }}
                >
                  <TableCell align="center">
                    <Checkbox
                      color="success"
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => onSelect(team.id)}
                      size="small"
                      sx={{
                        "& .MuiSvgIcon-root": {
                          fontSize: { xs: 18, sm: 20 },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                      }}
                    >
                      {(team.cluster_rank ?? 0) <= 3 && (
                        <Trophy
                          size={16}
                          color={theme.palette.warning.main}
                          fill={theme.palette.warning.main}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          fontWeight: (team.cluster_rank ?? 0) <= 3 ? 700 : 600,
                          color: (team.cluster_rank ?? 0) <= 3 
                            ? theme.palette.warning.main 
                            : theme.palette.text.primary,
                        }}
                      >
                        #{team.cluster_rank ?? "N/A"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="left">
                    <Typography
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: { xs: "120px", sm: "240px" },
                        color: theme.palette.text.primary,
                      }}
                    >
                      {team.team_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: { xs: "120px", sm: "200px" },
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {team.school_name}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.8rem", sm: "0.9rem" },
                      color: theme.palette.success.main,
                    }}
                  >
                    {team.total_score ?? 0}
                  </TableCell>
                  <TableCell align="center">
                    {team.status === "completed" ? (
                      <Chip
                        size="small"
                        label="Completed"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.65rem", sm: "0.7rem" },
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.dark,
                          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        }}
                      />
                    ) : team.status === "in_progress" ? (
                      <Chip
                        size="small"
                        label="In Progress"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.65rem", sm: "0.7rem" },
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.dark,
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                        }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        label="Not Started"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.65rem", sm: "0.7rem" },
                          bgcolor: alpha(theme.palette.grey[400], 0.08),
                          color: theme.palette.grey[600],
                          border: `1px solid ${alpha(theme.palette.grey[400], 0.2)}`,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        sessionStorage.setItem('fromRankings', 'true');
                        onNavigate(`/results/${selectedContest?.id}`, {
                          state: { teamId: team.id, clusterId: cluster.id },
                        });
                      }}
                      sx={{
                        bgcolor: theme.palette.success.main,
                        color: "#fff",
                        textTransform: "none",
                        borderRadius: 1.5,
                        fontSize: { xs: "0.7rem", sm: "0.8rem" },
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 0.5, sm: 0.75 },
                        fontWeight: 600,
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: theme.palette.success.dark,
                        boxShadow: `0 2px 4px ${alpha(theme.palette.success.main, 0.25)}`,
                      },
                      }}
                    >
                      View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  );
});

// ========================= Rankings Component =========================

const Ranking = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuthStore();
  const { advanceToChampionship, undoChampionshipAdvancement } = useRankingsStore();

  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [openCluster, setOpenCluster] = useState<Set<number>>(new Set());
  const [contests, setContests] = useState<Array<{ id: number; contest_name?: string; name?: string }>>([]);
  const [clusters, setClusters] = useState<ClusterEntry[]>([]);
  const [selectedContest, setSelectedContest] = useState<{ id: number; contest_name?: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);
  
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isLoading) {
      timer = setTimeout(() => setShowPreloader(true), 40);
    } else {
      setShowPreloader(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);
  
  const cacheRef = useRef<Map<number, CacheEntry>>(new Map());

  useEffect(() => {
    const fetchContests = async () => {
      try {
        if (!isAuthenticated) return;
        if (role?.user_type !== 2) return;
        const organizerId = role?.user?.id;
        if (!organizerId) return;
        const { data } = await api.get(`/api/mapping/contestToOrganizer/getByOrganizer/${organizerId}/`);
        const contestsData = data?.Contests ?? [];
        // Filter to only show contests that are open (is_open === true)
        const openContests = contestsData.filter((contest: any) => contest.is_open === true);
        setContests(openContests);
      } catch (e: any) {
        
      }
    };

    if (isAuthenticated && role?.user_type === 2) {
      fetchContests();
    }
  }, [isAuthenticated, role]);

  /**
   * Handles contest selection when contests are filtered to only open contests.
   * Automatically selects the first open contest if the current selection is no longer available.
   */
  useEffect(() => {
    if (contests.length === 0) {
      if (selectedContest) {
        setSelectedContest(null);
      }
      return;
    }
    
    if (selectedContest && !contests.find((c: any) => c.id === selectedContest.id)) {
      setSelectedContest(contests[0]);
    } else if (!selectedContest && contests.length > 0) {
      setSelectedContest(contests[0]);
    }
  }, [contests, selectedContest]);

  const fetchClusterTeams = useCallback(
    async (cluster: ClusterEntry): Promise<ClusterEntry> => {
      try {
        const { data: teamResp } = await api.get(
          `/api/mapping/clusterToTeam/getAllTeamsByCluster/${cluster.id}/`
        );

        const rankedTeams: RankedTeam[] = (teamResp?.Teams ?? [])
          .map((team: any): RankedTeam => {
            const total =
              cluster.cluster_type === "preliminary"
                ? team.preliminary_total_score ?? 0
                : team.total_score ?? 0;
            return {
              id: team.id,
              team_name: team.team_name ?? team.name,
              school_name: team.school_name ?? "N/A",
              total_score: total,
              advanced_to_championship: team.advanced_to_championship ?? false,
              cluster_rank: 0,
              status: total > 0 ? "in_progress" : "not_started",
            };
          })
          .sort((a: RankedTeam, b: RankedTeam) => b.total_score - a.total_score)
          .map((team: RankedTeam, index: number) => ({
            ...team,
            cluster_rank: index + 1,
          }));

        return { ...cluster, teams: rankedTeams, _statusFetched: false };
      } catch {
        return { ...cluster, teams: [], _statusFetched: false };
      }
    },
    []
  );

  /**
   * Fetches clusters for the selected contest with caching support.
   * Uses cache if available and less than 5 minutes old, unless forceRefresh is true.
   */
  const fetchClusters = useCallback(
    async (forceRefresh = false) => {
      if (!selectedContest) return;
      const contestId = selectedContest.id;

      if (!forceRefresh) {
        const cached = cacheRef.current.get(contestId);
        if (cached && Array.isArray(cached.clusters)) {
          setClusters(cached.clusters);
          setIsLoading(false);
          // Use cached data if less than 5 minutes old
          if (Date.now() - cached.timestamp < 300_000) return;
        }
      }

      setIsLoading(true);
      try {
        const { data: clusterResp } = await api.get(
          `/api/mapping/clusterToContest/getAllClustersByContest/${contestId}/`
        );

        const baseClusters: ClusterEntry[] = (clusterResp?.Clusters ?? [])
          .filter(
            (raw: any) =>
              (raw.cluster_name ?? raw.name ?? "").trim().toLowerCase() !==
              "all teams"
          )
          .map((raw: any) => ({
            id: raw.id,
            cluster_name: raw.cluster_name ?? raw.name ?? "Unnamed Cluster",
            cluster_type: raw.cluster_type ?? "preliminary",
            teams: [],
            _statusFetched: false,
          })
          );

        const clustersWithTeams = await Promise.all(
          baseClusters.map((cluster) => fetchClusterTeams(cluster))
        );

        setClusters(clustersWithTeams);
        cacheRef.current.set(contestId, {
          timestamp: Date.now(),
          clusters: clustersWithTeams,
        });
      } catch (error) {
        console.error("Failed to fetch clusters", error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedContest, fetchClusterTeams]
  );

  useEffect(() => {
    if (!selectedContest) return;

    fetchClusters();

    const handleDataChange = async (event: DataChangeEvent) => {
      if (event.type === "contest" && event.action === "delete" && event.id === selectedContest?.id) {
        // Selected contest was deleted, clear selection
        setSelectedContest(null);
        setClusters([]);
        setIsLoading(true);
      } else if (
        (event.type === "team" &&
          (event.contestId === selectedContest?.id || !event.contestId)) ||
        (event.type === "cluster" &&
          (event.contestId === selectedContest?.id || !event.contestId)) ||
        event.type === "championship"
      ) {
        await fetchClusters(true);
      }
    };

    const unsubscribeDataChange = onDataChange(handleDataChange);

    const interval = setInterval(() => {
      fetchClusters(true);
    }, 20000);

    return () => {
      clearInterval(interval);
      unsubscribeDataChange();
    };
  }, [selectedContest, fetchClusters]);

  useEffect(() => {
    if (openCluster.size === 0 || clusters.length === 0) return;

    const fetchStatusForCluster = async (clusterId: number) => {
      const idx = clusters.findIndex((c) => c.id === clusterId);
      if (idx === -1) return;
      const cluster = clusters[idx];
      if (cluster._statusFetched) return;

      try {
        const updatedTeams: RankedTeam[] = await Promise.all(
          (cluster.teams ?? []).map(async (t) => {
            try {
              const { data: s } = await api.get(
                `/api/mapping/scoreSheet/allSubmittedForTeam/${t.id}/`
              );
              const total = t.total_score ?? 0;
              const status =
                s?.allSubmitted && total > 0
                  ? "completed"
                  : s?.submittedCount > 0 || total > 0
                  ? "in_progress"
                  : "not_started";
              return { ...t, status };
            } catch {
              return { ...t, status: "not_started" };
            }
          })
        );

        setClusters((prev) => {
          const next = [...prev];
          next[idx] = {
            ...cluster,
            teams: updatedTeams,
            _statusFetched: true,
          };
          return next;
        });

        if (selectedContest?.id) {
          const cached = cacheRef.current.get(selectedContest.id);
          if (cached) {
            const cloned = cached.clusters.map((c) =>
              c.id === clusterId
                ? { ...c, teams: updatedTeams, _statusFetched: true }
                : c
            );
            cacheRef.current.set(selectedContest.id, {
              timestamp: cached.timestamp,
              clusters: cloned,
            });
          }
        }
      } catch {
        // ignore status fetch errors
      }
    };

    openCluster.forEach((clusterId) => {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster && !cluster._statusFetched) {
        fetchStatusForCluster(clusterId);
      }
    });
  }, [openCluster, clusters, selectedContest?.id]);

  const championshipState = useMemo(() => {
    if (!selectedContest || clusters.length === 0) {
      return {
        hasAdvanced: false,
        hasAdvancedTeams: false,
        hasChampionshipClusters: false,
      };
    }

    const hasAdvancedTeams = clusters.some((cluster) =>
      cluster.teams.some((team) => team.advanced_to_championship === true)
    );

    const metaByType = clusters.reduce<{ hasChampionship: boolean; hasRedesign: boolean }>(
      (acc, cluster) => {
      const name = cluster.cluster_name?.toLowerCase() || "";
        const type = (cluster.cluster_type || "").toLowerCase();
        if (type === "championship" || name.includes("championship")) {
          acc.hasChampionship = true;
        }
        if (type === "redesign" || name.includes("redesign")) {
          acc.hasRedesign = true;
        }
        return acc;
      },
      { hasChampionship: false, hasRedesign: false }
    );

    return {
      hasAdvanced: hasAdvancedTeams || metaByType.hasChampionship || metaByType.hasRedesign,
      hasAdvancedTeams,
      hasChampionshipClusters: metaByType.hasChampionship || metaByType.hasRedesign,
      hasChampionship: metaByType.hasChampionship,
      hasRedesign: metaByType.hasRedesign,
    };
  }, [clusters, selectedContest]);

  const toggleCluster = useCallback((id: number) => {
    setOpenCluster((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((teamId: number) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  }, []);

  const handleNavigate = useCallback(
    (path: string, state: any) => {
      navigate(path, { state });
    },
    [navigate]
  );

  const handleAdvanceToChampionship = useCallback(async () => {
    if (!selectedContest || selectedTeams.length === 0 || isAdvancing) return;

    const toastId = "advance-championship";
    if (clusters.length === 0) {
      toast.error("Cluster data is still loading. Please try again shortly.", { id: toastId });
      return;
    }

    const missing: string[] = [];
    const hasChampionshipCluster = clusters.some((cluster) =>
      (cluster.cluster_type?.toLowerCase?.() ?? "").includes("championship") ||
      cluster.cluster_name?.toLowerCase().includes("championship")
    );
    const hasRedesignCluster = clusters.some((cluster) =>
      (cluster.cluster_type?.toLowerCase?.() ?? "").includes("redesign") ||
      cluster.cluster_name?.toLowerCase().includes("redesign")
    );

    if (!hasChampionshipCluster) missing.push("Championship cluster");
    if (!hasRedesignCluster) missing.push("Redesign cluster");

    if (missing.length > 0) {
      toast.error(`${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not created. Please create them before advancing teams.`, {
        id: toastId,
      });
      return;
    }

    setIsAdvancing(true);
    toast.loading("Advancing teams to championship...", { id: toastId });
    try {
      await advanceToChampionship(selectedContest.id, selectedTeams);
      toast.success(`Successfully advanced ${selectedTeams.length} teams!`, { id: toastId });
      setSelectedTeams([]);
      await fetchClusters(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to advance to championship", { id: toastId });
    } finally {
      setIsAdvancing(false);
    }
  }, [selectedContest, selectedTeams, clusters, isAdvancing, advanceToChampionship, fetchClusters]);

  const handleUndoChampionshipAdvancement = useCallback(async () => {
    if (!selectedContest) return;
    if (isUndoing) return;
    setIsUndoing(true);
    const toastId = "undo-championship";
    toast.loading("Undoing championship advancement...", { id: toastId });
    try {
      await undoChampionshipAdvancement(selectedContest.id);
      toast.success("Successfully undone championship advancement!", { id: toastId });
      await fetchClusters(true);

      // Small delay to ensure backend processing is complete before notifying other components
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("championshipUndone", {
            detail: { contestId: selectedContest.id },
          })
        );
      }, 50);
    } catch (error) {
      toast.error("Failed to undo championship advancement", { id: toastId });
    } finally {
      setIsUndoing(false);
    }
  }, [selectedContest, undoChampionshipAdvancement, fetchClusters, isUndoing]);

  return (
    <Box 
      sx={{ 
        maxWidth: 1100, 
        mx: "auto",
        px: { xs: 2, sm: 3 }, 
        py: { xs: 3, sm: 4 },
      }}
    >
      {/* Contest selection */}
      {contests.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "white",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 700,
              fontSize: { xs: "1rem", sm: "1.15rem" },
              color: theme.palette.text.primary,
            }}
          >
            Select Contest
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {contests.map((contest) => {
              const isActive = selectedContest?.id === contest.id;
              return (
                <Button
                  key={contest.id}
                  variant={isActive ? "contained" : "outlined"}
                  onClick={() => setSelectedContest(contest)}
                  sx={{
                    bgcolor: isActive ? theme.palette.success.main : "transparent",
                    color: isActive ? "white" : theme.palette.text.primary,
                    borderColor: theme.palette.divider,
                    "&:hover": {
                      bgcolor: isActive
                        ? theme.palette.success.dark
                        : alpha(theme.palette.success.main, 0.05),
                      borderColor: theme.palette.success.main,
                    },
                    textTransform: "none",
                    borderRadius: 2,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    fontWeight: 600,
                    boxShadow: "none",
                  }}
                >
                  {contest.contest_name || contest.name}
                </Button>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Stats Card */}
      {selectedContest ? (
      <Paper
          elevation={0}
        sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
          bgcolor: "white",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
              flexWrap: { xs: "wrap", md: "nowrap" },
              gap: 2,
          }}
        >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                  p: 1.5,
                  borderRadius: 2,
                  display: "flex",
          }}
        >
                <Trophy size={24} color={theme.palette.success.main} />
              </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                    display: "block",
                    mb: 0.25,
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
              }}
            >
              Selected Teams
            </Typography>
            <Typography
                  variant="h3"
              sx={{
                    fontWeight: 800,
                color: theme.palette.success.main,
                    fontSize: { xs: "1.75rem", sm: "2.25rem" },
                    lineHeight: 1,
              }}
            >
              {selectedTeams.length}
            </Typography>
          </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {championshipState.hasAdvanced && (
                  <Button
                    variant="contained"
                    onClick={handleUndoChampionshipAdvancement}
                    disabled={isUndoing}
                    sx={{
                      bgcolor: theme.palette.error.main,
                      "&:hover": {
                        bgcolor: theme.palette.error.dark,
                      },
                    "&:disabled": {
                      bgcolor: alpha(theme.palette.error.main, 0.5),
                      },
                      color: "white",
                      textTransform: "none",
                      borderRadius: 2,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    fontWeight: 600,
                    boxShadow: "none",
                    }}
                  >
                    Undo Championship
                  </Button>
                )}
                {selectedTeams.length > 0 && (
                  <Button
                    variant="contained"
                    onClick={handleAdvanceToChampionship}
                    disabled={isAdvancing}
                    sx={{
                      bgcolor: theme.palette.success.main,
                      "&:hover": {
                        bgcolor: theme.palette.success.dark,
                      },
                    "&:disabled": {
                      bgcolor: alpha(theme.palette.success.main, 0.5),
                      },
                      color: "white",
                      textTransform: "none",
                      borderRadius: 2,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    fontWeight: 600,
                    boxShadow: "none",
                    }}
                  >
                    Advance to Championship
                  </Button>
                )}
              </Box>
          </Box>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            mb: 3,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.grey[50], 0.5),
            textAlign: "center",
          }}
        >
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.875rem", sm: "0.95rem" },
            }}
          >
            Select a contest to view dashboard stats.
          </Typography>
      </Paper>
      )}

      {/* Clusters / rankings list */}
      {!selectedContest ? null : showPreloader && clusters.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 4,
            bgcolor: alpha(theme.palette.grey[50], 0.3),
              }}
            >
          <GreenDotsPreloader />
            </Paper>
      ) : (
        clusters.map((cluster) => (
          <ClusterRow
            key={cluster.id}
            cluster={cluster}
            isOpen={openCluster.has(cluster.id)}
            selectedTeams={selectedTeams}
            selectedContest={selectedContest}
            onToggle={toggleCluster}
            onSelect={handleSelect}
            onNavigate={handleNavigate}
          />
        ))
      )}
    </Box>
  );
};

export default Ranking;
