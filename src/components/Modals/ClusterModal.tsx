import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import Modal from "./Modal";
import { useParams } from "react-router-dom";
import theme from "../../theme";
import { useEffect, useState } from "react";
import { useClusterStore } from "../../store/primary_stores/clusterStore";
import type { ClusterType } from "../../types";
import { useMapClusterToContestStore } from "../../store/map_stores/mapClusterToContestStore";
import toast from "react-hot-toast";


export interface IClusterModalProps {
  open: boolean;
  handleClose: () => void;
  mode: "new" | "edit";
  contestid?: number;
  clusterData?: {
    id: number;
    cluster_name: string;
    cluster_type?: string;
  };
  onSuccess?: () => void;
}

export default function ClusterModal(props: IClusterModalProps) {
  const { handleClose, open, mode, contestid, clusterData, onSuccess } = props;
  const { contestId } = useParams();
  const effectiveContestId = contestid ?? (contestId ? parseInt(contestId, 10) : undefined);
  const [clusterName, setClusterName] = useState("");
  const [clusterType, setClusterType] = useState<ClusterType>("preliminary");
  const { addClusterToContest, updateClusterInContest } = useMapClusterToContestStore();
  const { createCluster, editCluster, fetchClusterById, cluster } = useClusterStore();

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && clusterData) {
      setClusterName(clusterData.cluster_name);
      const normalized = String(clusterData.cluster_type ?? "preliminary").toLowerCase() as ClusterType;
      setClusterType(normalized);
      if (!clusterData.cluster_type && clusterData.id) {
        fetchClusterById(clusterData.id).catch(() => {});
      }
    } else if (mode === "new") {
      setClusterName("");
      setClusterType("preliminary");
    }
  }, [open, mode, clusterData]);

  useEffect(() => {
    if (mode === "edit" && cluster && clusterData && cluster.id === clusterData.id) {
      const fetchedType = (cluster as any).cluster_type as string | undefined;
      if (fetchedType) {
        setClusterType(String(fetchedType).toLowerCase() as ClusterType);
      }
    }
  }, [mode, cluster, clusterData]);

  const handleCloseModal = () => {
    handleClose();
    setClusterName("");
    setClusterType("preliminary");
  };

  const handleCreateCluster = (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveContestId) {
      handleCloseModal();
      createCluster({
        cluster_name: clusterName,
        cluster_type: clusterType,
        contestid: effectiveContestId,
      })
        .then((createdCluster) => {
          if (createdCluster) {
            addClusterToContest(effectiveContestId, createdCluster);
          }
          toast.success("Cluster created successfully!");
        })
        .catch((error) => {
          console.error("Failed to create cluster", error);
          toast.error("Failed to create cluster");
        });
    }
  };

  const handleEditCluster = (event: React.FormEvent) => {
    event.preventDefault();
    if (clusterData?.id && effectiveContestId) {
      handleCloseModal();
      editCluster({ id: clusterData.id, cluster_name: clusterName })
        .then((updatedCluster) => {
          if (updatedCluster) {
            updateClusterInContest(effectiveContestId, updatedCluster);
          }
          toast.success("Cluster updated successfully!");
          onSuccess && onSuccess();
        })
        .catch((error: any) => {
          console.error("Failed to edit cluster", error);
          const errorMessage = error?.response?.data?.error || error?.message || "Failed to update cluster";
          toast.error(errorMessage);
        });
    } else {
      toast.error("Missing cluster or contest context. Please retry from Manage Contest.");
    }
  };

  const title = mode === "new" ? "New Cluster" : "Edit Cluster";
  const buttonText = mode === "new" ? "Create Cluster" : "Update Cluster";
  const handleSubmit = mode === "new" ? handleCreateCluster : handleEditCluster;

  return (
    <Modal
      open={open}
      handleClose={handleClose}
      title={title}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextField
          required
          label="Cluster Name"
          variant="outlined"
          value={clusterName}
          onChange={(e: any) => setClusterName(e.target.value)}
          sx={{ mt: 1, width: 300 }}
        />
        <FormControl
          required
          sx={{
            width: 300,
            mt: 3,
          }}
        >
          <InputLabel>Cluster Type</InputLabel>
          <Select
            value={clusterType}
            label="Cluster Type"
            sx={{ textAlign: "left" }}
            disabled={mode === "edit"}
            onChange={(e) => setClusterType(e.target.value as ClusterType)}
          >
            <MenuItem value="preliminary">Preliminary</MenuItem>
            <MenuItem value="championship">Championship</MenuItem>
            <MenuItem value="redesign">Redesign</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          sx={{
            width: 150,
            height: 44,
            bgcolor: theme.palette.success.main,
            color: "#fff",
            mt: 3,
            textTransform: "none",
            borderRadius: "12px",
            boxShadow: `
              0 4px 12px rgba(76, 175, 80, 0.3),
              0 2px 4px rgba(76, 175, 80, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": { 
              bgcolor: theme.palette.success.dark,
              transform: "translateY(-2px)",
              boxShadow: `
                0 6px 16px rgba(76, 175, 80, 0.4),
                0 4px 8px rgba(76, 175, 80, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `,
            },
            "&:active": {
              transform: "translateY(0px)",
              boxShadow: `
                0 2px 8px rgba(76, 175, 80, 0.3),
                inset 0 2px 4px rgba(0, 0, 0, 0.1)
              `,
            },
          }}
        >
          {buttonText}
        </Button>
      </form>
    </Modal>
  );
}
