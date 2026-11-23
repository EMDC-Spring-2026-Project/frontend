// ==============================
// Component: OrganizerJudgesTable
// Comprehensive table for managing judges, clusters, and their assignments.
// Features expandable rows, judge assignment management, and scoring oversight.
// ==============================

// ==============================
// React Core
// ==============================
import * as React from "react";
import { useState, useMemo, useCallback } from "react";

// ==============================
// Router
// ==============================
import { useNavigate } from "react-router-dom";

// ==============================
// UI Libraries & Theme
// ==============================
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Button, Container, CircularProgress, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

// ==============================
// Store Hooks
// ==============================
import { useMapClusterJudgeStore } from "../../store/map_stores/mapClusterToJudgeStore";
import { useJudgeStore } from "../../store/primary_stores/judgeStore";
import useContestJudgeStore from "../../store/map_stores/mapContestToJudgeStore";
import { useMapScoreSheetStore } from "../../store/map_stores/mapScoreSheetStore";

// ==============================
// Types
// ==============================
import { Cluster, Judge, JudgeData } from "../../types";

// ==============================
// Local Components
// ==============================
import JudgeModal from "../Modals/JudgeModal";
import ClusterModal from "../Modals/ClusterModal";
import AreYouSureModal from "../Modals/AreYouSureModal";
import Modal from "../Modals/Modal";

// ==============================
// Types & Interfaces
// ==============================

interface IJudgesTableProps {
  judges: any[];
  clusters: any[];
  contestid: number;
  currentCluster?: Cluster;
}

interface IOrganizerClustersTeamsTableProps {
  clusters: any[];
  judgesByClusterId: {
    [key: number]: Judge[];
  };
  contestid: number;
}

// ==============================
// Data Creation Helpers
// ==============================

function createDataJudge(
  name: string,
  role: string,
  editJudge: any,
  cluster: string,
  scoreSheets: any[],
  viewEditScores: any,
  deleteJudge: any,
  isAllSheetsSubmited: boolean
) {
  return {
    name,
    role,
    editJudge,
    cluster,
    scoreSheets,
    viewEditScores,
    deleteJudge,
    isAllSheetsSubmited,
  };
}

function JudgeRow(props: { row: ReturnType<typeof createDataJudge> }) {
  const { row } = props;
  const [open, setOpen] = useState(false);

  return (
    <React.Fragment>
      <TableRow
        sx={{
          mt: 0,
          "& .MuiTableCell-root": { fontSize: "0.95rem", py: 1.25 },
          "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell sx={{ width: 56 }}>
          <IconButton size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
          {row.role}
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
          {row.name}
        </TableCell>
        <TableCell scope="row" sx={{ width: 56 }}>
          {row.isAllSheetsSubmited ? (
            <CheckIcon sx={{ color: "#1e7e34" }} />
          ) : (
            <CloseIcon sx={{ color: "#d32f2f" }} />
          )}
        </TableCell>
        <TableCell align="right">
          <Container
            sx={{
              paddingBottom: 0,
              paddingTop: 0,
              p: 0,
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 1, md: 1.5 },
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
          >
            {row.viewEditScores}
            {row.editJudge}
            {row.deleteJudge}
          </Container>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1 } }}>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ width: 180, color: "text.secondary" }}>
                    Cluster(s)
                  </TableCell>
                  <TableCell align="left">{row.cluster}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ width: 180, color: "text.secondary" }}>
                    Score Sheets
                  </TableCell>
                  <TableCell align="left">
                    {row.scoreSheets.map((value, index) => (
                      <Typography
                        key={index}
                        component="span"
                        style={{ display: "inline" }}
                      >
                        {value}
                        {index < row.scoreSheets.length - 1 ? ", " : ""}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

type RemovalScope = "cluster" | "contest" | "system";

const removalScopeText: Record<RemovalScope, string> = {
  cluster: "in this cluster",
  contest: "in this contest",
  system: "in this contest",
};

/** Explains what removing a judge does to team totals. `count` is null if it couldn't be checked. */
function removalMessage(count: number | null, scope: RemovalScope): string {
  const where = removalScopeText[scope];
  if (count === null) {
    return `Couldn't check this judge's submitted scores. Any scores they submitted ${where} will stop counting toward team totals.`;
  }
  if (count === 0) {
    return scope === "system"
      ? `This judge has no submitted score sheets ${where}. Scores they submitted in any other contest will be removed.`
      : `This judge has no submitted score sheets ${where}, so team totals won't change.`;
  }
  const sheets = count === 1 ? "1 score sheet" : `${count} score sheets`;
  const otherContests =
    scope === "system" ? " Scores they submitted in any other contest will be removed too." : "";
  return `This judge has submitted ${sheets} ${where}. If you continue, those scores will stop counting toward team totals, and rankings will change.${otherContests}`;
}

function JudgesTable(props: IJudgesTableProps) {
  const { judges, clusters, contestid, currentCluster } = props;
  const navigate = useNavigate();
  const [openJudgeModal, setOpenJudgeModal] = useState(false);
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const [openDeleteOptions, setOpenDeleteOptions] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string>("");
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<React.ReactNode>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const scoreCheckRequest = React.useRef(0);
  const [judgeData, setJudgeData] = useState<JudgeData | undefined>(undefined);
  const { submissionStatus, checkAllScoreSheetsSubmitted, deleteJudge } = useJudgeStore();

  const [judgeId, setJudgeId] = useState(0);
  const { fetchJudgesByClusterId, removeJudgeFromCluster, fetchClustersForJudges, judgesByClusterId, fetchAllClustersByJudgeId } = useMapClusterJudgeStore();
  const { removeJudgeFromContestStoreIfNoOtherClusters, getAllJudgesByContestId } = useContestJudgeStore();
  const { clearMappings } = useMapScoreSheetStore();

  const { judgeClusters } = useMapClusterJudgeStore();

  const titles = ["Lead", "Technical", "General", "Journal"];

  // Memoize judge IDs to prevent unnecessary re-fetches
  const judgeIdsString = React.useMemo(() => {
    return judges.map(j => j.id).sort((a, b) => a - b).join(',');
  }, [judges]);

  const lastCheckedClusterIdRef = React.useRef<number | null>(null);
  const lastCheckedJudgeIdsRef = React.useRef<string>("");
  const lastFetchedJudgeIdsRef = React.useRef<string>("");

  // Check submission status for this specific cluster - only when cluster or judges actually change
  React.useEffect(() => {
    if (!currentCluster || !judges || judges.length === 0) return;

    const clusterChanged = lastCheckedClusterIdRef.current !== currentCluster.id;
    const judgesChanged = lastCheckedJudgeIdsRef.current !== judgeIdsString;

    if (clusterChanged || judgesChanged) {
      lastCheckedClusterIdRef.current = currentCluster.id;
      lastCheckedJudgeIdsRef.current = judgeIdsString;
      checkAllScoreSheetsSubmitted(judges as any, currentCluster.id);
    }
  }, [currentCluster?.id, judgeIdsString, checkAllScoreSheetsSubmitted, judges]);

  // Fetch clusters for judges - only when judge IDs actually change
  React.useEffect(() => {
    if (!judges || judges.length === 0) return;

    if (lastFetchedJudgeIdsRef.current !== judgeIdsString) {
      lastFetchedJudgeIdsRef.current = judgeIdsString;
      fetchClustersForJudges(judges as any).catch(console.error);
    }
  }, [judgeIdsString, fetchClustersForJudges, judges]);

  // Memoize the handler to prevent unnecessary re-renders
  const handleOpenJudgeModal = useCallback(async (judgeData: JudgeData) => {
    // For editing, we need to ensure we only use preliminary clusters
    // Championship and redesign clusters should not be considered for editing
    const isPreliminaryCluster = (cluster: Cluster | undefined): boolean => {
      if (!cluster) return false;
      const clusterType = cluster.cluster_type?.toLowerCase() || '';
      const clusterName = cluster.cluster_name?.toLowerCase() || '';
      return clusterType !== 'championship' && 
             clusterType !== 'redesign' &&
             !clusterName.includes('championship') &&
             !clusterName.includes('redesign');
    };
    
    let preliminaryCluster: Cluster | undefined = undefined;
    
    // Use currentCluster if it's preliminary, otherwise fetch all clusters and find a preliminary one
    if (isPreliminaryCluster(currentCluster)) {
      preliminaryCluster = currentCluster;
    } else {
      try {
        const allClusters = await fetchAllClustersByJudgeId(judgeData.id);
        const preliminaryClusters = allClusters.filter(isPreliminaryCluster);
        if (preliminaryClusters.length > 0) {
          preliminaryCluster = preliminaryClusters[0];
        }
      } catch (error) {
        // Error fetching clusters - will use fallback
      }
    }
    
    if (preliminaryCluster) {
      setJudgeData({
        ...judgeData,
        cluster: preliminaryCluster
      });
      setOpenJudgeModal(true);
    } else {
      toast.error('No preliminary cluster found for this judge. Cannot edit.');
    }
  }, [currentCluster, fetchAllClustersByJudgeId]);

  // Open delete options (choose between cluster-only vs complete delete)
  const handleOpenDeleteOptions = useCallback((judgeId: number) => {
    setJudgeId(judgeId);
    setOpenDeleteOptions(true);
  }, []);

  // Count the judge's submitted scoresheets that would stop counting.
  const countSubmittedSheets = async (
    id: number,
    scope: RemovalScope
  ): Promise<number> => {
    type SheetItem = { scoresheet?: { isSubmitted?: boolean } | null };
    const submitted = (items: SheetItem[] = []) =>
      items.filter((item) => item?.scoresheet?.isSubmitted).length;

    // Count within this contest; organizers can't always read other contests.
    const clusterIds =
      scope === "cluster" ? (currentCluster ? [currentCluster.id] : []) : clusters.map((c) => c.id);
    const counts = await Promise.all(
      clusterIds.map(async (clusterId) => {
        try {
          const { data } = await api.get(
            `/api/mapping/scoreSheet/getSheetsByJudgeAndCluster/${id}/${clusterId}/`
          );
          return submitted(data?.ScoreSheets);
        } catch (error: any) {
          // The backend answers 403 to organizers when the judge has no
          // scoresheets in one of their own clusters, so that means none.
          if (error?.response?.status === 403) return 0;
          throw error;
        }
      })
    );
    return counts.reduce((total, n) => total + n, 0);
  };

  // Ask for confirmation, explaining how many submitted scores will stop counting.
  const openRemovalConfirm = (title: string, scope: RemovalScope, action: () => void) => {
    setConfirmTitle(title);
    setOnConfirm(() => action);
    setOpenDeleteOptions(false);
    setConfirmMessage("Checking this judge's submitted scores…");
    setConfirmLoading(true);
    setOpenAreYouSure(true);

    const request = ++scoreCheckRequest.current;
    countSubmittedSheets(judgeId, scope)
      .then((count) => {
        if (request === scoreCheckRequest.current) setConfirmMessage(removalMessage(count, scope));
      })
      .catch(() => {
        if (request === scoreCheckRequest.current) setConfirmMessage(removalMessage(null, scope));
      })
      .finally(() => {
        if (request === scoreCheckRequest.current) setConfirmLoading(false);
      });
  };

  // Memoize navigate handler
  const handleNavigateToJudging = useCallback((judgeId: number) => {
    navigate(`/judging/${judgeId}/`);
  }, [navigate]);

  const handleDelete = async (judgeId: number) => {
    try {
      if (!currentCluster) {
        toast.dismiss();
        toast.error("Cluster information not available. Please refresh the page and try again.");
        return;
      }

      // Before removal, check if judge is in any other clusters in this contest
  
      let isInOtherClusters = false;
      if (contestid) {
        const otherClusters = clusters.filter(c => c.id !== currentCluster.id);

        // First check local state
        isInOtherClusters = otherClusters.some(cluster => {
          const judgesInCluster = judgesByClusterId[cluster.id] || [];
          return judgesInCluster.some(j => j.id === judgeId);
        });

        // If not found in local state, fetch fresh data for other clusters to be sure
        if (!isInOtherClusters && otherClusters.length > 0) {
          // Fetch judges for all other clusters to ensure we have accurate data
          await Promise.all(
            otherClusters.map(cluster => fetchJudgesByClusterId(cluster.id, true))
          );

          // Check again after fetching
          isInOtherClusters = otherClusters.some(cluster => {
            const judgesInCluster = judgesByClusterId[cluster.id] || [];
            return judgesInCluster.some(j => j.id === judgeId);
          });
        }
      }

      // Remove judge from cluster
      await removeJudgeFromCluster(judgeId, currentCluster.id);

      // Only remove from contest if judge is not in any other clusters
      if (contestid && !isInOtherClusters) {
        removeJudgeFromContestStoreIfNoOtherClusters(judgeId, contestid);
      }

      toast.dismiss();
      toast.success(`Judge removed from ${currentCluster.cluster_name} cluster successfully!`);
    } catch (error: any) {
      let errorMessage = "Failed to remove judge from cluster. Please try again.";
      if (error?.response?.data?.error) {
        errorMessage = `Failed to remove judge: ${error.response.data.error}`;
      } else if (error?.response?.data?.detail) {
        errorMessage = `Failed to remove judge: ${error.response.data.detail}`;
      } else if (error?.message) {
        errorMessage = `Failed to remove judge: ${error.message}`;
      }
      toast.dismiss();
      toast.error(errorMessage);
    }
  };
  // delete judge from all cluter
  const handleDeleteFromAllClusters = async (judgeId: number) => {
    try {
      for (const cluster of clusters) {
        const judgesInCluster = judgesByClusterId[cluster.id] || [];

        if (judgesInCluster.some(j => j.id === judgeId)) {
          await removeJudgeFromCluster(judgeId, cluster.id);
        }
      }

      if (currentCluster?.id) {
        await fetchJudgesByClusterId(currentCluster.id, true);
      }
      await getAllJudgesByContestId(contestid, true);

      toast.dismiss();
      toast.success("Judge removed from contest.");
    } catch (error) {
      toast.dismiss();
      toast.error("Error removing judge from contest.");
    } finally {
      setOpenAreYouSure(false);
    }
  };

  // Permanently delete judge (system-wide)
  const handleDeleteCompletely = async (judgeId: number) => {
    try {
      await deleteJudge(judgeId);

      // Refresh all clusters in this contest to remove the judge visually
      if (clusters && clusters.length > 0) {
        await Promise.all(clusters.map((cluster) => fetchJudgesByClusterId(cluster.id, true)));
      }
      // Refresh contest judges list
      if (contestid) {
        await getAllJudgesByContestId(contestid, true);
      }

      toast.dismiss();
      toast.success("Judge deleted from system successfully.");
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || "Failed to delete judge.";
      toast.dismiss();
      toast.error(msg);
    } finally {
      setOpenAreYouSure(false);
      setOpenDeleteOptions(false);
    }
  };

  const handleCloseJudgeModal = () => {
    setOpenJudgeModal(false);
  };

  const getScoreSheets = (judge: any) => {
    const scoreSheets: string[] = [];

    // Use the specific cluster row's context if available to avoid stale mappings
    const clusterType = (currentCluster?.cluster_type || "preliminary").toLowerCase();

    if (clusterType === "redesign") {
      scoreSheets.push("Redesign");
      return scoreSheets;
    }

    if (clusterType === "championship") {
      scoreSheets.push("Championship");
      return scoreSheets;
    }

    // Use cluster-specific sheet flags if available (from MapJudgeToCluster), 
    // otherwise fall back to global judge flags
    const sheetFlags = judge.cluster_sheet_flags || {
      journal: judge.journal,
      presentation: judge.presentation,
      mdo: judge.mdo,
      runpenalties: judge.runpenalties,
      otherpenalties: judge.otherpenalties,
    };

    if (sheetFlags.journal) scoreSheets.push("Journal");
    if (sheetFlags.presentation) scoreSheets.push("Presentation");
    if (sheetFlags.mdo) scoreSheets.push("Machine Design & Operation");
    if (sheetFlags.otherpenalties) scoreSheets.push("General Penalties");
    if (sheetFlags.runpenalties) scoreSheets.push("Run Penalties");
    return scoreSheets;
  };

  // Check if current cluster is championship or redesign
  const isChampionshipOrRedesignCluster = currentCluster && (
    currentCluster.cluster_type === 'championship' ||
    currentCluster.cluster_name?.toLowerCase().includes('championship') ||
    currentCluster.cluster_type === 'redesign' ||
    currentCluster.cluster_name?.toLowerCase().includes('redesign')
  );

  // Memoize rows to prevent recreating buttons on every render
  const rows = useMemo(() => judges.map((judge) => {
    // Get submission status for this specific cluster
    const clusterSubmissionStatus = currentCluster?.id && submissionStatus
      ? submissionStatus[currentCluster.id]
      : null;
    const isSubmitted = clusterSubmissionStatus ? clusterSubmissionStatus[judge.id] : false;
    return createDataJudge(
      `${judge.first_name} ${judge.last_name}`,
      `${titles[judge.role - 1]}`,
      isChampionshipOrRedesignCluster ? null : (
        <Button
          variant="outlined"
          onClick={async (e) => {
            e.stopPropagation();
            // Use cluster-specific sheet flags for editing
            const clusterFlags = judge.cluster_sheet_flags || {};
            // Note: cluster will be determined in handleOpenJudgeModal to ensure it's preliminary
            await handleOpenJudgeModal({
              id: judge.id,
              firstName: judge.first_name,
              lastName: judge.last_name,
              cluster: judgeClusters[judge.id], // This might be championship/redesign, but will be replaced
              role: judge.role,
              journalSS: clusterFlags.journal || false,
              presSS: clusterFlags.presentation || false,
              mdoSS: clusterFlags.mdo || false,
              runPenSS: clusterFlags.runpenalties || false,
              genPenSS: clusterFlags.otherpenalties || false,
              redesignSS: clusterFlags.redesign || false,
              championshipSS: clusterFlags.championship || false,
              phoneNumber: judge.phone_number,
            });
          }}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 0.6, sm: 0.8, md: 1 },
            borderRadius: 2,
            fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
            minWidth: { xs: "90px", sm: "110px", md: "130px" },
            height: { xs: "32px", sm: "36px", md: "40px" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#4caf50",
            color: "white",
            "&:hover": {
              backgroundColor: "#45a049",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 8px rgba(76,175,80,0.25)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          Edit Judge
        </Button>
      ),
      // Display the specific cluster name for this row
      currentCluster?.cluster_name || judgeClusters[judge.id]?.cluster_name,
      getScoreSheets(judge),
      <Button
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/judging/${judge.id}/`);
        }}
        sx={{
          mr: { xs: 0.5, sm: 1, md: 2 },
          textTransform: "none",
          fontWeight: 600,
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 0.6, sm: 0.8, md: 1 },
          borderRadius: 2,
          fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
          minWidth: { xs: "90px", sm: "110px", md: "130px" },
          height: { xs: "32px", sm: "36px", md: "40px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderColor: "#4caf50",
          color: "#4caf50",
          "&:hover": {
            backgroundColor: "#4caf50",
            color: "white",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 8px rgba(76,175,80,0.25)",
          },
          transition: "all 0.2s ease-in-out",
        }}
      >
        View/Edit Scores
      </Button>,
      <Button
        variant="outlined"
        sx={{
          ml: { xs: 0.5, sm: 1, md: 2 },
          textTransform: "none",
          fontWeight: 600,
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 0.6, sm: 0.8, md: 1 },
          borderRadius: 2,
          fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
          minWidth: { xs: "90px", sm: "110px", md: "130px" },
          height: { xs: "32px", sm: "36px", md: "40px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderColor: "#d32f2f",
          color: "#d32f2f",
          "&:hover": {
            backgroundColor: "#d32f2f",
            color: "white",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 8px rgba(211,47,47,0.25)",
          },
          transition: "all 0.2s ease-in-out",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDeleteOptions(judge.id);
        }}
      >
        Delete
      </Button>,
      isSubmitted
    );
  }), [judges, submissionStatus, currentCluster?.id, isChampionshipOrRedesignCluster, handleOpenJudgeModal, handleOpenDeleteOptions, handleNavigateToJudging, currentCluster, judgeClusters, navigate]);

  return (
    <TableContainer component={Box}>
      <Table
        sx={{
          "& .MuiTableCell-root": {
            fontSize: { xs: "0.7rem", sm: "0.85rem", md: "0.95rem" },
            py: { xs: 0.5, sm: 0.75, md: 1.25 },
            px: { xs: 0.5, sm: 0.75, md: 1 }
          },
        }}
      >
        <TableBody>
          {rows.map((row, index) => (
            <JudgeRow key={index} row={row} />
          ))}
        </TableBody>
      </Table>
      <JudgeModal
        open={openJudgeModal}
        handleClose={handleCloseJudgeModal}
        mode="edit"
        clusters={clusters}
        judgeData={judgeData}
        clusterContext={currentCluster}
        contestid={contestid}
        onSuccess={async () => {
          clearMappings();

          if (currentCluster?.id) {
            await fetchJudgesByClusterId(currentCluster.id, true);
          }
          if (clusters && clusters.length > 0) {
            await Promise.all(
              clusters.map(cluster => fetchJudgesByClusterId(cluster.id, true))
            );
          }
          handleCloseJudgeModal();
        }}
      />
      {/* Delete Options Modal */}
      <Modal
        open={openDeleteOptions}
        handleClose={() => setOpenDeleteOptions(false)}
        title="Delete Judge"
      >
        <Container
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1.25,
            alignItems: "center",
            justifyContent: "center",
            p: 0,
            width: "100%",
          }}
        >
          <Button
            variant="contained"
            onClick={() =>
              openRemovalConfirm("Remove judge from contest?", "contest", () =>
                handleDeleteFromAllClusters(judgeId)
              )
            }
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 0.6, sm: 0.8, md: 1 },
              height: { xs: "32px", sm: "36px", md: "40px" },
              bgcolor: "#d32f2f",
              color: "#fff",
              minWidth: 0,
              flex: 1,
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
              fontWeight: 600,
              "&:hover": { bgcolor: "#b71c1c" },
            }}
          >
            Delete from contest
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              openRemovalConfirm("Remove judge from this cluster?", "cluster", () =>
                handleDelete(judgeId)
              )
            }
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 0.6, sm: 0.8, md: 1 },
              height: { xs: "32px", sm: "36px", md: "40px" },
              borderColor: "#9e9e9e",
              color: "#424242",
              minWidth: 0,
              flex: 1,
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
              fontWeight: 600,
              "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            }}
          >
            Delete from cluster
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              openRemovalConfirm(
                "Delete judge completely? This will remove all mappings and data.",
                "system",
                () => handleDeleteCompletely(judgeId)
              )
            }
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 0.6, sm: 0.8, md: 1 },
              height: { xs: "32px", sm: "36px", md: "40px" },
              bgcolor: "#d32f2f",
              color: "#fff",
              minWidth: 0,
              flex: 1,
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
              fontWeight: 600,
              "&:hover": { bgcolor: "#b71c1c" },
            }}
          >
            Delete completely
          </Button>
        </Container>
      </Modal>

      {/* Confirm Modal */}
      <AreYouSureModal
        open={openAreYouSure}
        handleClose={() => setOpenAreYouSure(false)}
        title={confirmTitle || "Are you sure?"}
        message={confirmMessage}
        confirmDisabled={confirmLoading}
        handleSubmit={() => {
          if (onConfirm) onConfirm();
        }}
      />
    </TableContainer>
  );
}

function OrganizerJudgesTable(
  props: IOrganizerClustersTeamsTableProps
) {
  const { clusters, judgesByClusterId, contestid } = props;
  const [openClusterIds, setOpenClusterIds] = useState<number[]>([]);
  const [openClusterModal, setOpenClusterModal] = useState(false);
  const [clusterData, setClusterData] = useState<Cluster | undefined>(
    undefined
  );

  const handleToggleRow = (clusterId: number) => {
    setOpenClusterIds((prevIds) =>
      prevIds.includes(clusterId)
        ? prevIds.filter((id) => id !== clusterId)
        : [...prevIds, clusterId]
    );
  };

  const handleCloseModal = (type: string) => {
    if (type === "cluster") {
      setOpenClusterModal(false);
    }
  };

  const handleOpenModal = (type: string, clusterData: Cluster) => {
    if (type === "cluster") {
      setOpenClusterModal(true);
      setClusterData(clusterData);
    }
  };

  return judgesByClusterId ? (
    <TableContainer
      component={Box}
      sx={{
        overflowAnchor: "none",
        contain: "layout",
      }}
    >
      <Table
        sx={{
          "& .MuiTableCell-root": { fontSize: "0.95rem", py: 1.25 },
        }}
      >
        <TableBody>
          {clusters.map((cluster) => (
            <React.Fragment key={cluster.id}>
              <TableRow
                onClick={() => handleToggleRow(cluster.id)}
                sx={{
                  bgcolor:
                    cluster.cluster_name === "All Teams"
                      ? "#f4fbf6"
                      : "transparent",
                }}
              >
                <TableCell sx={{ width: 56 }}>
                  <IconButton size="small">
                    {openClusterIds.includes(cluster.id) ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>
                </TableCell>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{ fontWeight: 700 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <span>{cluster.cluster_name}</span>
    {cluster.cluster_name !== "All Teams" && (
      <Chip 
        label={
          cluster.cluster_type === 'championship' || cluster.cluster_name?.toLowerCase().includes('championship') 
            ? 'Championship'
            : cluster.cluster_type === 'redesign' || cluster.cluster_name?.toLowerCase().includes('redesign')
            ? 'Redesign'
            : 'Preliminary'
        }
        size="small"
        sx={{
          height: 20,
          fontSize: "0.7rem",
          backgroundColor: 
            (cluster.cluster_type === 'championship' || cluster.cluster_name?.toLowerCase().includes('championship'))
              ? '#fff3cd'
              : (cluster.cluster_type === 'redesign' || cluster.cluster_name?.toLowerCase().includes('redesign'))
              ? '#cfe2ff'
              : '#d1e7dd',
          color: 
            (cluster.cluster_type === 'championship' || cluster.cluster_name?.toLowerCase().includes('championship'))
              ? '#856404'
              : (cluster.cluster_type === 'redesign' || cluster.cluster_name?.toLowerCase().includes('redesign'))
              ? '#084298'
              : '#0f5132',
        }}
      />
    )}
  </Box>
                </TableCell>
                <TableCell align="right">
                  {cluster.cluster_name != "All Teams" && (
                    <Button
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal("cluster", {
                          cluster_name: cluster.cluster_name,
                          id: cluster.id,
                        });
                      }}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        px: 2.25,
                        py: 0.75,
                        borderRadius: 1.5,
                      }}
                    >
                      Edit Cluster
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  style={{ paddingBottom: 0, paddingTop: 0 }}
                  colSpan={5}
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    overflowAnchor: "none",
                    containIntrinsicSize: "auto",
                  }}
                >
                  <Collapse
                    in={openClusterIds.includes(cluster.id)}
                    timeout="auto"
                    unmountOnExit
                    sx={{
                      willChange: "height",
                      contain: "layout style",
                    }}
                  >
                    <Box
                      sx={{
                        py: 1,
                        isolation: "isolate",
                      }}
                    >
                      {judgesByClusterId[cluster.id] && (
                        <JudgesTable
                          judges={judgesByClusterId[cluster.id]}
                          clusters={clusters}
                          contestid={contestid}
                          currentCluster={cluster}
                        />
                      )}
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      <ClusterModal
        open={openClusterModal}
        handleClose={() => handleCloseModal("cluster")}
        mode="edit"
        clusterData={clusterData}
      />
    </TableContainer>
  ) : (
    <CircularProgress />
  );
}

export default React.memo(OrganizerJudgesTable);