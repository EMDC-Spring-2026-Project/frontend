// TeamModal Component - Modal for creating and editing teams
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import Modal from "./Modal";
import theme from "../../theme";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useTeamStore } from "../../store/primary_stores/teamStore";
import useMapClusterTeamStore from "../../store/map_stores/mapClusterToTeamStore";

export interface ITeamModalProps {
  open: boolean;
  handleClose: () => void;
  mode: "new" | "edit";
  clusters?: any[];
  contestId?: number;
  onSuccess?: () => void;
  teamData?: {
    id: number;
    team_name: string;
    school_name: string;
    clusterid: number;
    username: string;
    first_name: string;
    last_name: string;
    contestid: number;
  };
}

export default function TeamModal(props: ITeamModalProps) {
  const { handleClose, open, mode, clusters, contestId, teamData, onSuccess } = props;
  const [teamName, setTeamName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [cluster, setCluster] = useState(-1);
  const [coachFirstName, setCoachFirstName] = useState("");
  const [coachLastName, setCoachLastName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const { createTeam, editTeam } = useTeamStore();
  const addTeamToCluster = useMapClusterTeamStore((s) => s.addTeamToCluster);
  const removeTeamFromOtherClusters = useMapClusterTeamStore((s) => s.removeTeamFromOtherClusters);
  const fetchTeamsByClusterId = useMapClusterTeamStore((s) => s.fetchTeamsByClusterId);

  const title = mode === "new" ? "New Team" : "Edit Team";

  // Create a new team with coach account and assign to contest/cluster
  // Initializes all scores to 0 and creates coach login credentials
  const handleCreateTeam = async () => {
    if (contestId) {
      const loadingToast = toast.loading("Creating team and coach account...");
      try {
        // Remove hover/focus from the submit button to avoid lingering hover styles
        if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        // Create team with initial scores and coach information
        const createdTeam = await createTeam({
          team_name: teamName,
          school_name: schoolName || "NA",
          journal_score: 0,
          presentation_score: 0,
          machinedesign_score: 0,
          penalties_score: 0,
          total_score: 0,
          redesign_score: 0,
          championship_score: 0,
          clusterid: cluster,
          username: coachEmail,
          password: "password",
          first_name: coachFirstName || "n/a",
          last_name: coachLastName || "",
          contestid: contestId,
        });

        if (createdTeam) {
          const allTeamsCluster = clusters?.find((c) => c.cluster_name === "All Teams");
          // Add to selected cluster first (if not All Teams)
          if (cluster !== -1 && (!allTeamsCluster || cluster !== allTeamsCluster.id)) {
            addTeamToCluster(cluster, createdTeam);
          }
          // Then ensure presence under All Teams (will not remove from other clusters)
          if (allTeamsCluster) {
            addTeamToCluster(allTeamsCluster.id, createdTeam);
          }
          // Background refresh both lists to ensure UI sync with backend
          try {
            if (cluster !== -1) {
              fetchTeamsByClusterId(cluster, true);
            }
            if (allTeamsCluster?.id) {
              fetchTeamsByClusterId(allTeamsCluster.id, true);
          }
          } catch {}
        }

        toast.success("Team created successfully!", { id: loadingToast });
        onSuccess?.();
      } catch (error: any) {
        toast.error("Failed to create team. Please try again.", { id: loadingToast });
      }
    }
  };

  // Update existing team information and coach details
  const handleEditTeam = async () => {
    const loadingToast = toast.loading("Updating team information...");
    try {
      // Remove hover/focus from the submit button to avoid lingering hover styles
      if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Update team with current form values
      const updatedTeam = await editTeam({
        id: teamData?.id ?? 0,
        team_name: teamName,
        school_name: schoolName || "NA",
        clusterid: cluster,
        username: teamData?.username || coachEmail,
        first_name: coachFirstName,
        last_name: coachLastName,
        contestid: contestId ?? 0,
      });

      if (updatedTeam && cluster !== -1) {
        const allTeamsCluster = clusters?.find((c) => c.cluster_name === "All Teams");
        // Remove from all non-AllTeams clusters, then place in selected cluster
        removeTeamFromOtherClusters(updatedTeam.id, cluster);
        addTeamToCluster(cluster, updatedTeam);
        // Ensure presence in All Teams
        if (allTeamsCluster?.id) {
          addTeamToCluster(allTeamsCluster.id, updatedTeam);
        }
        // Refresh both views
        try {
          await fetchTeamsByClusterId(cluster, true);
          if (allTeamsCluster?.id) await fetchTeamsByClusterId(allTeamsCluster.id, true);
        } catch {}
      }

      toast.success("Team updated successfully!", { id: loadingToast });
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to update team. Please try again.", { id: loadingToast });
    }
  };

  const handleCloseModal = () => {
    handleClose();
    setCluster(-1);
    setCoachEmail("");
    setCoachFirstName("");
    setCoachLastName("");
    setTeamName("");
    setSchoolName("");
  };

  useEffect(() => {
    if (teamData) {
      setCoachFirstName(teamData.first_name);
      setCoachLastName(teamData.last_name);
      setCoachEmail(teamData.username);
      setTeamName(teamData.team_name);
      setSchoolName(teamData.school_name);
      setCluster(teamData.clusterid);
    }
  }, [teamData]);

  const buttonText = mode === "new" ? "Create Team" : "Update Team";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCloseModal();
    if (mode === "new") {
      handleCreateTeam();
    } else {
      handleEditTeam();
    }
  };

  return (
    <Modal open={open} handleClose={handleCloseModal} title={title}>
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
          label="Team Name"
          variant="outlined"
          value={teamName}
          onChange={(e: any) => setTeamName(e.target.value)}
          sx={{ mt: 1, width: 300 }}
        />
        <TextField
          label="School Name"
          variant="outlined"
          value={schoolName}
          onChange={(e: any) => setSchoolName(e.target.value)}
          sx={{ mt: 3, width: 300 }}
          placeholder="School Name"
        />
        <FormControl
          required
          sx={{
            width: 300,
            mt: 3,
          }}
        >
          <InputLabel>Cluster</InputLabel>
          <Select
            value={cluster}
            label="Cluster"
            sx={{ textAlign: "left" }}
            onChange={(e) => setCluster(Number(e.target.value))}
          >
            {clusters?.map((clusterItem) => (
              <MenuItem key={clusterItem.id} value={clusterItem.id}>
                {clusterItem.cluster_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Coach First Name"
          variant="outlined"
          value={coachFirstName}
          onChange={(e: any) => setCoachFirstName(e.target.value)}
          sx={{ mt: 3, width: 300 }}
        />
        <TextField
          label="Coach Last Name"
          variant="outlined"
          value={coachLastName}
          onChange={(e: any) => setCoachLastName(e.target.value)}
          sx={{ mt: 3, width: 300 }}
        />
        <TextField
          required
          label="Coach Email"
          variant="outlined"
          value={coachEmail}
          onChange={(e: any) => setCoachEmail(e.target.value)}
          disabled={mode === "edit"}
          sx={{ mt: 3, width: 300 }}
        />

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
