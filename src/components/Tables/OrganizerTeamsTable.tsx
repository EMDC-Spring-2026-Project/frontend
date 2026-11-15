// ==============================
// Component: OrganizerTeamsTable
// Hierarchical table for managing teams organized by clusters.
// Features expandable cluster rows and team management.
// ==============================

// ==============================
// React Core
// ==============================
import * as React from "react";
import { useState, useEffect } from "react";

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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Button, CircularProgress, Typography } from "@mui/material";
import theme from "../../theme";
import toast from "react-hot-toast";

// ==============================
// Store Hooks
// ==============================
import { useMapCoachToTeamStore } from "../../store/map_stores/mapCoachToTeamStore";
import useMapClusterTeamStore from "../../store/map_stores/mapClusterToTeamStore";
import { useClusterStore } from "../../store/primary_stores/clusterStore";
import { useMapClusterToContestStore } from "../../store/map_stores/mapClusterToContestStore";

// ==============================
// Types
// ==============================
import { Cluster, TeamData } from "../../types";

// ==============================
// Local Components
// ==============================
import ClusterModal from "../Modals/ClusterModal";
import TeamModal from "../Modals/TeamModal";
import Modal from "../Modals/Modal";
import DeleteTeamDialog from "../Modals/DeleteTeamDialog";

// ==============================
// Types & Interfaces
// ==============================

interface IOrganizerTeamsTableProps {
  clusters: any[];
  contestId: number;
}

function OrganizerTeamsTable(props: IOrganizerTeamsTableProps) {
  const { clusters, contestId } = props;

  // ------------------------------
  // Local UI State
  // ------------------------------
  const [openClusterModal, setOpenClusterModal] = useState(false);
  const [openTeamModal, setOpenTeamModal] = useState(false);
  const [openClusterIds, setOpenClusterIds] = useState<number[]>(
    clusters.length > 0 ? [clusters[0].id] : []
  );
  const [clusterData, setClusterData] = useState<Cluster | undefined>(undefined);
  const [teamData, setTeamData] = useState<TeamData | undefined>(undefined);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<number | null>(null);

  // ------------------------------
  // Store State & Actions
  // ------------------------------
  const { coachesByTeams } = useMapCoachToTeamStore();
  const teamsByClusterId = useMapClusterTeamStore((state) => state.teamsByClusterId);
  const fetchTeamsByClusterId = useMapClusterTeamStore((state) => state.fetchTeamsByClusterId);
  const { deleteCluster } = useClusterStore();
  const { removeClusterFromContest } = useMapClusterToContestStore();

  // ==============================
  // Event Handlers
  // ==============================

  const handleCloseModal = (type: string) => {
    if (type === "cluster") {
      setOpenClusterModal(false);
    } else {
      setOpenTeamModal(false);
    }
  };

  const handleDeleteClick = (clusterId: number) => {
    setClusterToDelete(clusterId);
    setOpenDeleteConfirmModal(true);
  };

  // For Delete Team Popup
  const [openDeleteTeamDialog, setOpenDeleteTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{
    id: number;
    name: string;
    mapId?: number;
    clusterId?: number;
  } | null>(null);


  const handleConfirmDelete = async () => {
    if (clusterToDelete) {
      try {
        await deleteCluster(clusterToDelete);
        toast.dismiss();
        toast.success('Cluster deleted successfully!');
        removeClusterFromContest(contestId, clusterToDelete);
        setOpenDeleteConfirmModal(false);
        setClusterToDelete(null);
      } catch (error) {
        toast.dismiss();
        toast.error('Failed to delete cluster');
        console.error('Delete cluster error:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setOpenDeleteConfirmModal(false);
    setClusterToDelete(null);
  };

  const handleOpenClusterModal = (clusterData: Cluster) => {
    setClusterData(clusterData);
    setOpenClusterModal(true);
  };



  const handleOpenTeamModal = (teamData: TeamData) => {
    setTeamData(teamData);
    setOpenTeamModal(true);
  };

  // ==============================
  // Data Loading & Effects
  // ==============================

  // Update teamData when coachesByTeams changes (e.g., after team edit)
  useEffect(() => {
    if (openTeamModal && teamData && coachesByTeams[teamData.id]) {
      const coach = coachesByTeams[teamData.id];
      // Only update if values actually changed to avoid infinite loops
      if (
        coach.username !== teamData.username ||
        coach.first_name !== teamData.first_name ||
        coach.last_name !== teamData.last_name
      ) {
        setTeamData({
          ...teamData,
          username: coach.username || teamData.username,
          first_name: coach.first_name || teamData.first_name,
          last_name: coach.last_name || teamData.last_name,
        });
      }
    }
  }, [coachesByTeams, openTeamModal]);

  const handleToggleRow = (clusterId: number) => {
    setOpenClusterIds((prevIds) =>
      prevIds.includes(clusterId)
        ? prevIds.filter((id) => id !== clusterId)
        : [...prevIds, clusterId]
    );
  };


  const clusterIdsString = React.useMemo(() => {
    return clusters.map(c => c.id).sort((a, b) => a - b).join(',');
  }, [clusters]);

  const lastFetchedSpecialClustersRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!contestId) return;
    const handleChampionshipUndo = (event: Event) => {
      const detail = (event as CustomEvent<{ contestId?: number }>).detail;
      if (detail?.contestId && detail.contestId !== contestId) return;
      // Use current clusters from closure - will always have latest data
      clusters.forEach((cluster) => {
        fetchTeamsByClusterId(cluster.id, true).catch((error) => {
          console.error("Failed to refresh teams after undo:", error);
        });
      });
    };
    window.addEventListener("championshipUndone", handleChampionshipUndo);
    return () => {
      window.removeEventListener("championshipUndone", handleChampionshipUndo);
    };
  }, [contestId, clusterIdsString, clusters, fetchTeamsByClusterId]);

  // Fetch teams for championship/redesign clusters - only once per cluster
  useEffect(() => {
    if (!clusters.length) {
      lastFetchedSpecialClustersRef.current.clear();
      return;
    }

    const currentClusterIds = new Set(clusters.map(c => c.id));
    
    // Remove clusters that no longer exist
    lastFetchedSpecialClustersRef.current.forEach(clusterId => {
      if (!currentClusterIds.has(clusterId)) {
        lastFetchedSpecialClustersRef.current.delete(clusterId);
      }
    });

    const specialClustersToFetch = clusters.filter((cluster) => {
      const type = String(cluster.cluster_type || "").toLowerCase();
      const isSpecial = type === "championship" || type === "redesign";
      const alreadyFetched = lastFetchedSpecialClustersRef.current.has(cluster.id);
      return isSpecial && !alreadyFetched;
    });

    if (specialClustersToFetch.length === 0) return;

    // Mark clusters as being fetched
    specialClustersToFetch.forEach(c => lastFetchedSpecialClustersRef.current.add(c.id));

    specialClustersToFetch.forEach((cluster) => {
      fetchTeamsByClusterId(cluster.id, true).catch((error) => {
        console.error("Failed to sync special cluster teams:", error);
        // Remove from set if fetch failed so it can be retried
        lastFetchedSpecialClustersRef.current.delete(cluster.id);
      });
    });
  }, [clusterIdsString, fetchTeamsByClusterId]);

  function TeamTable({
    teams,
    cluster,
  }: {
    teams: any[] | undefined;
    cluster: number;
  }) {
    return (
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
          {teams?.map((team) => (
            <TableRow key={team.id}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                {team.team_name}
                {team.school_name && (
                  <Typography variant="body2" sx={{
                    color: theme.palette.grey[600],
                    fontSize: { xs: "0.6rem", sm: "0.75rem", md: "0.875rem" }
                  }}>
                    ({team.school_name})
                  </Typography>
                )}
              </TableCell>
              {team.judge_disqualified && (
                <TableCell sx={{ color: "red" }}>Disqualified</TableCell>
              )}
              <TableCell align="center">
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() =>
                      handleOpenTeamModal({
                        id: team.id,
                        team_name: team.team_name,
                        school_name: team.school_name || "NA",
                        clusterid: cluster,
                        username: coachesByTeams[team.id]?.username || "N/A",
                        first_name: coachesByTeams[team.id]?.first_name || "N/A",
                        last_name: coachesByTeams[team.id]?.last_name || "N/A",
                        contestid: contestId,
                      })
                    }
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      px: { xs: 1.5, sm: 2, md: 2.25 },
                      py: { xs: 0.4, sm: 0.6, md: 0.75 },
                      borderRadius: 2,
                      fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
                      borderColor: "#4caf50",
                      color: "#4caf50",
                      "&:hover": {
                        backgroundColor: "#4caf50",
                        color: "white",
                      },
                    }}
                  >
                    Edit Team
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setSelectedTeam({
                        id: team.id,
                        name: team.team_name,
                        mapId: team.map_id,
                        clusterId: cluster,
                      });
                      setOpenDeleteTeamDialog(true);
                    }}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      px: { xs: 1.5, sm: 2, md: 2.25 },
                      py: { xs: 0.4, sm: 0.6, md: 0.75 },
                      borderRadius: 2,
                      fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
                      borderColor: theme.palette.error.main,
                      color: theme.palette.error.main,
                      "&:hover": {
                        backgroundColor: theme.palette.error.light,
                        borderColor: theme.palette.error.dark,
                      },
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // ==============================
  // Main Component Render
  // ==============================

  return teamsByClusterId ? (
    <TableContainer
      component={Box}
      sx={{
        overflowAnchor: "none",
        contain: "layout",
      }}
    >
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
          {clusters.map((cluster) => (
            <React.Fragment key={cluster.id}>
              <TableRow
                onClick={() => handleToggleRow(cluster.id)}
                sx={{
                  bgcolor:
                    cluster.cluster_name === "All Teams"
                      ? "#f4fbf6" // light green only for All Teams
                      : "transparent",
                }}
              >
                <TableCell>
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
                  sx={{ fontWeight: 700 /* bolder label like dashboard */ }}
                >
                  {cluster.cluster_name}
                </TableCell>
                <TableCell align="right">
                  {cluster.cluster_name != "All Teams" && (
                    <Button
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenClusterModal(cluster);
                      }}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        px: { xs: 1.5, sm: 2, md: 2.25 },
                        py: { xs: 0.4, sm: 0.6, md: 0.75 },
                        borderRadius: 1.5,
                        fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
                      }}
                    >
                      Edit Cluster
                    </Button>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleDeleteClick(cluster.id)}
                    sx={{
                      color: theme.palette.error.main,
                      borderColor: theme.palette.error.main,
                      textTransform: "none",
                      fontWeight: 600,
                      px: { xs: 1.5, sm: 2, md: 2.25 },
                      py: { xs: 0.4, sm: 0.6, md: 0.75 },
                      borderRadius: 1.5,
                      fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.8rem" },
                      "&:hover": {
                        backgroundColor: theme.palette.error.light,
                        borderColor: theme.palette.error.dark,
                      },
                    }}
                  >
                    Delete
                  </Button>
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
                      {teamsByClusterId[cluster.id] && (
                        <TeamTable
                          teams={teamsByClusterId[cluster.id]}
                          cluster={cluster.id}
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
        contestid={contestId}
        onSuccess={() => { }}
      />
      <TeamModal
        open={openTeamModal}
        handleClose={() => handleCloseModal("team")}
        mode="edit"
        teamData={teamData}
        clusters={clusters}
        contestId={contestId}
      />
      {selectedTeam && (
        <DeleteTeamDialog
          open={openDeleteTeamDialog}
          onClose={() => setOpenDeleteTeamDialog(false)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          mapId={selectedTeam.mapId}
          clusterId={selectedTeam.clusterId}
          showRemoveFromCluster={
            clusters.find((c) => c.id === selectedTeam.clusterId)?.cluster_name !== "All Teams"
          }
        />
      )}


      {/* Delete Confirmation Modal */}
      <Modal
        open={openDeleteConfirmModal}
        handleClose={handleCancelDelete}
        title="Delete Cluster"
      >
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this cluster? This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleCancelDelete}
              sx={{
                borderColor: theme.palette.grey[400],
                color: theme.palette.grey[600],
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmDelete}
              sx={{
                bgcolor: theme.palette.error.main,
                "&:hover": { bgcolor: theme.palette.error.dark },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>
    </TableContainer>
  ) : (
    <CircularProgress />
  );
}

export default React.memo(OrganizerTeamsTable);
