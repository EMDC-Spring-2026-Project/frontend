import {
  Button,
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Box,
  Chip,
  IconButton,
  Typography,
} from "@mui/material";
import Modal from "./Modal";
import theme from "../../theme";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import useUserRoleStore from "../../store/map_stores/mapUserToRoleStore";
import { useJudgeStore } from "../../store/primary_stores/judgeStore";
import useContestJudgeStore from "../../store/map_stores/mapContestToJudgeStore";
import { useMapClusterJudgeStore } from "../../store/map_stores/mapClusterToJudgeStore";
import CloseIcon from "@mui/icons-material/Close";
import { Cluster, JudgeData } from "../../types";
import { dispatchDataChange } from "../../utils/dataChangeEvents";

export interface IJudgeModalProps {
  open: boolean;
  handleClose: () => void;
  mode: "new" | "edit";
  contestid?: number;
  clusters?: Cluster[];
  judgeData?: JudgeData;
  clusterContext?: Cluster;
  onSuccess?: () => void;
}

/**
 * Modal component for creating or editing judges.
 * Handles judge creation, updates, and assignment to clusters and contests.
 */
export default function JudgeModal(props: IJudgeModalProps) {
  const { handleClose, open, mode, judgeData, clusters, contestid, clusterContext, onSuccess } = props;

  const { addJudgeToContest, updateJudgeInContest } = useContestJudgeStore();
  const { addJudgeToCluster, judgesByClusterId, fetchAllClustersByJudgeId } = useMapClusterJudgeStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [clusterIds, setClusterIds] = useState<number[]>([]);
  const { user, getUserByRole } = useUserRoleStore();
  const { createJudge, editJudge } = useJudgeStore();
  const [scoreSheetsSelectIsOpen, setScoreSheetsSelectIsOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(0);

  const scoringSheetOptions = [
    { label: "Journal", value: "journalSS", isPreliminary: true },
    { label: "Presentation", value: "presSS", isPreliminary: true },
    { label: "Machine Design & Operation", value: "mdoSS", isPreliminary: true },
    { label: "Run Penalties", value: "runPenSS", isPreliminary: true },
    { label: "General Penalties", value: "genPenSS", isPreliminary: true },
    { label: "Redesign", value: "redesignSS", isPreliminary: false },
    { label: "Championship", value: "championshipSS", isPreliminary: false },
  ];

  const titleOptions = [
    { label: "Lead", value: 1 },
    { label: "Technical", value: 2 },
    { label: "General", value: 3 },
    { label: "Journal", value: 4 },
  ];

  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [errors, setErrors] = useState({
    cluster: false,
    scoreSheets: false,
    titles: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentCluster = clusterIds.length > 0 && clusters ? clusters.find(cluster => cluster.id === clusterIds[0]) : undefined;
  // For edit mode, use clusterContext as the original cluster (the one being edited from)
  // For create mode, there is no original cluster
  const originalCluster = mode === "edit" ? clusterContext : judgeData?.cluster;
  
  /**
   * Determines the cluster type based on cluster properties.
   * Checks cluster_type field and cluster name for championship/redesign indicators.
   */
  const getClusterType = (cluster: typeof currentCluster) => {
    if (!cluster) return 'preliminary';
    if (cluster.cluster_type === 'championship' || cluster.cluster_name?.toLowerCase().includes('championship')) return 'championship';
    if (cluster.cluster_type === 'redesign' || cluster.cluster_name?.toLowerCase().includes('redesign')) return 'redesign';
    return 'preliminary';
  };
  
  const currentClusterType = getClusterType(currentCluster);
  const originalClusterType = getClusterType(originalCluster);
  
  const isChampionshipCluster = currentClusterType === 'championship';
  const isRedesignCluster = currentClusterType === 'redesign';
  const isPreliminaryCluster = currentClusterType === 'preliminary';
  
  const isChampionshipOrRedesignJudge = mode === "edit" && (
    originalClusterType === 'championship' || originalClusterType === 'redesign'
  );

  const isScoresheetDisabled = (option: typeof scoringSheetOptions[0]) => {
    if (isChampionshipCluster) {
      return option.value !== "championshipSS";
    } else if (isRedesignCluster) {
      return option.value !== "redesignSS";
    } else if (isPreliminaryCluster) {
      return !option.isPreliminary;
    }
    return false;
  };

  useEffect(() => {
    if (judgeData) {
      // Fetch user data for email field, but don't fail if it doesn't work
      getUserByRole(judgeData.id, 3).catch((error) => {
        console.warn('Could not fetch user data for judge:', judgeData.id, error);
        // Email will remain empty, but modal can still be used
      });
    }
  }, [judgeData, getUserByRole]);

  useEffect(() => {
    if (judgeData) {
      setFirstName(judgeData.firstName || '');
      setLastName(judgeData.lastName || '');
      // Set email from user data if available, otherwise leave empty
      setEmail(user?.username || '');
      // For edit mode, fetch all clusters for this judge
      if (mode === "edit") {
        fetchAllClustersByJudgeId(judgeData.id).then((allClusters: any) => {
          const preliminaryClusters = allClusters.filter((c: any) => {
            const cType = c.cluster_type || c.cluster_name?.toLowerCase().includes('championship') ? 'championship' :
                         c.cluster_name?.toLowerCase().includes('redesign') ? 'redesign' : 'preliminary';
            return cType === 'preliminary';
          });
          const clusterIdArray = preliminaryClusters.map((c: any) => c.id);
          setClusterIds(clusterIdArray);
        }).catch(() => {
          // If fetch fails, use clusterContext if available
          if (clusterContext?.id) {
            setClusterIds([clusterContext.id]);
          }
        });
      } else {
        // For new mode, initialize with empty array
        setClusterIds([]);
      }
      setPhoneNumber(judgeData.phoneNumber || '');

      // Initialize selected sheets from judge data
      const initialSheets = scoringSheetOptions
        .filter((option) => judgeData[option.value as keyof typeof judgeData])
        .map((option) => option.value);

      setSelectedSheets(initialSheets);
      setSelectedTitle(Number(judgeData.role) || 0);
    }
  }, [judgeData, user, mode, clusterContext, fetchAllClustersByJudgeId]);

  const handleCloseModal = () => {
    handleClose();
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setClusterIds([]);
    setSelectedSheets([]);
    setSelectedTitle(0);
    setErrors({ cluster: false, scoreSheets: false, titles: false });
    setErrorMessage(null);
  };

  const validateForm = () => {
    const isClusterInvalid = clusterIds.length === 0;
    const areTitlesInvalid = selectedTitle === 0;
    
    const hasPreliminarySheets = selectedSheets.some(sheet => 
      scoringSheetOptions.find(opt => opt.value === sheet)?.isPreliminary
    );
    const hasRedesignSheets = selectedSheets.includes("redesignSS");
    const hasChampionshipSheets = selectedSheets.includes("championshipSS");
    
    let areScoreSheetsInvalid = false;
    
    if (isChampionshipCluster && (hasPreliminarySheets || hasRedesignSheets)) {
      areScoreSheetsInvalid = true;
    } else if (isRedesignCluster && (hasPreliminarySheets || hasChampionshipSheets)) {
      areScoreSheetsInvalid = true;
    } else if (isPreliminaryCluster && (hasRedesignSheets || hasChampionshipSheets)) {
      areScoreSheetsInvalid = true;
    }

    setErrors({
      cluster: isClusterInvalid,
      scoreSheets: areScoreSheetsInvalid,
      titles: areTitlesInvalid,
    });

    return !isClusterInvalid && !areTitlesInvalid && !areScoreSheetsInvalid;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Remove hover/focus from the submit button to avoid lingering hover styles
    if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Close modal immediately for faster UX
    handleCloseModal();

    if (mode === "new") {
      handleCreateJudge();
    } else {
      handleEditJudge();
    }
  };

  const handleCreateJudge = async () => {
    if (contestid) {
      try {
        // Build cluster payloads for each selected cluster
        const clusterPayloads = clusterIds.map(cId => {
          const selectedCluster = clusters?.find(c => c.id === cId);
          let clusterSheets = selectedSheets;

          if (selectedCluster) {
            const clusterType = getClusterType(selectedCluster);
            if (clusterType === 'championship') {
              clusterSheets = ["championshipSS"];
            } else if (clusterType === 'redesign') {
              clusterSheets = ["redesignSS"];
            }
          }

          return {
            clusterid: cId,
            presentation: clusterSheets.includes("presSS"),
            mdo: clusterSheets.includes("mdoSS"),
            journal: clusterSheets.includes("journalSS"),
            runpenalties: clusterSheets.includes("runPenSS"),
            otherpenalties: clusterSheets.includes("genPenSS"),
            redesign: clusterSheets.includes("redesignSS"),
            championship: clusterSheets.includes("championshipSS"),
          };
        });

        const judgeData = {
          first_name: firstName || "n/a",
          last_name: lastName || "",
          phone_number: phoneNumber || "n/a",
          presentation: selectedSheets.includes("presSS"),
          mdo: selectedSheets.includes("mdoSS"),
          journal: selectedSheets.includes("journalSS"),
          runpenalties: selectedSheets.includes("runPenSS"),
          otherpenalties: selectedSheets.includes("genPenSS"),
          redesign: selectedSheets.includes("redesignSS"),
          championship: selectedSheets.includes("championshipSS"),
          username: email,
          password: "password",
          contestid: contestid,
          clusterids: clusterPayloads,
          role: selectedTitle,
        };

        const createdJudge = await createJudge(judgeData);
        if (createdJudge && contestid) {
          addJudgeToContest(contestid, createdJudge);
          // Add judge to each selected cluster
          for (const cId of clusterIds) {
            addJudgeToCluster(cId, createdJudge);

            // Emit data change event for judge assignment
            dispatchDataChange({
              type: "judge",
              action: "create",
              judgeId: createdJudge.id,
              clusterId: cId,
              contestId: contestid,
            });
          }
        }

        onSuccess?.();
        toast.success("Judge created successfully!");
      } catch (error: any) {
        toast.error("Failed to create judge. Please try again.");
      }
    }
  };

  const handleEditJudge = async () => {
    if (contestid && judgeData) {
      try {
        // Get all existing cluster assignments for this judge
        const existingClusters = await fetchAllClustersByJudgeId(judgeData.id);

        // Build the complete cluster assignments list
        const clusterAssignments = [];

        // Add the preliminary clusters being edited
        for (const cId of clusterIds) {
          const selectedCluster = clusters?.find(c => c.id === cId);
          let clusterSheets = selectedSheets;

          if (selectedCluster) {
            const clusterType = getClusterType(selectedCluster);
            if (clusterType === 'championship') {
              clusterSheets = ["championshipSS"];
            } else if (clusterType === 'redesign') {
              clusterSheets = ["redesignSS"];
            }
          }

          clusterAssignments.push({
            clusterid: cId,
            contestid: contestid,
            presentation: clusterSheets.includes("presSS"),
            journal: clusterSheets.includes("journalSS"),
            mdo: clusterSheets.includes("mdoSS"),
            runpenalties: clusterSheets.includes("runPenSS"),
            otherpenalties: clusterSheets.includes("genPenSS"),
            redesign: clusterSheets.includes("redesignSS"),
            championship: clusterSheets.includes("championshipSS"),
          });
        }

        // Add all existing championship/redesign assignments (preserve them)
        // Also preserve any cluster that has championship or redesign flags set
        for (const existingCluster of existingClusters as any) {
          const clusterType = getClusterType(existingCluster);
          const hasChampionshipFlags = existingCluster.sheet_flags?.championship ||
                                       existingCluster.sheet_flags?.redesign;

          // Keep championship/redesign clusters OR clusters with championship/redesign flags
          if (clusterType === 'championship' || clusterType === 'redesign' || hasChampionshipFlags) {
            // Don't include clusters we're currently editing
            if (!clusterIds.includes(existingCluster.id)) {
              clusterAssignments.push({
                clusterid: existingCluster.id,
                contestid: existingCluster.contest_id || contestid,
                presentation: existingCluster.sheet_flags?.presentation || false,
                journal: existingCluster.sheet_flags?.journal || false,
                mdo: existingCluster.sheet_flags?.mdo || false,
                runpenalties: existingCluster.sheet_flags?.runpenalties || false,
                otherpenalties: existingCluster.sheet_flags?.otherpenalties || false,
                redesign: existingCluster.sheet_flags?.redesign || false,
                championship: existingCluster.sheet_flags?.championship || false,
              });
            }
          }
        }

        const updatedData = {
          id: judgeData.id,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          presentation: selectedSheets.includes("presSS"),
          journal: selectedSheets.includes("journalSS"),
          mdo: selectedSheets.includes("mdoSS"),
          runpenalties: selectedSheets.includes("runPenSS"),
          otherpenalties: selectedSheets.includes("genPenSS"),
          username: email,
          role: selectedTitle,
          clusters: clusterAssignments, // Send ALL cluster assignments
        };

        const updatedJudge = await editJudge(updatedData as any);

        if (updatedJudge && contestid) {
          updateJudgeInContest(contestid, updatedJudge);

          // Handle cluster movement in frontend state
          const originalPreliminaryClusters = (existingClusters as any).filter((cluster: any) => getClusterType(cluster) === 'preliminary');

          // Update all affected clusters
          useMapClusterJudgeStore.setState({
            judgesByClusterId: {
              ...judgesByClusterId,
              ...Object.fromEntries(
                originalPreliminaryClusters.map((c: any) => [
                  c.id,
                  (judgesByClusterId[c.id] || []).filter((j: any) => j.id !== judgeData.id)
                ])
              ),
              ...Object.fromEntries(
                clusterIds.map(cId => [
                  cId,
                  [
                    ...(judgesByClusterId[cId] || []).filter((j: any) => j.id !== judgeData.id),
                    updatedJudge
                  ]
                ])
              )
            }
          });
        }

        // Dispatch data change event for judge update
        if (clusterIds.length > 0) {
          dispatchDataChange({
            type: "judge",
            action: "update",
            judgeId: judgeData.id,
            clusterId: clusterIds[0],
            contestId: contestid,
          });
        }

        toast.success("Judge updated successfully!");
        onSuccess?.();
      } catch (error: any) {
        console.error("Judge update error:", error);
        toast.error("Failed to update judge. Please try again.");
      }
    }
  };

  const handleScoringSheetsChange = (event: any) => {
    const value = event.target.value as string[];

    const hasPreliminarySheets = value.some(sheet =>
      scoringSheetOptions.find(opt => opt.value === sheet)?.isPreliminary
    );
    const hasRedesignSheets = value.includes("redesignSS");
    const hasChampionshipSheets = value.includes("championshipSS");

    let finalValue = value;
    if (hasRedesignSheets || hasChampionshipSheets) {
      finalValue = value.filter(sheet =>
        !scoringSheetOptions.find(opt => opt.value === sheet)?.isPreliminary
      );
    } else if (hasPreliminarySheets) {
      finalValue = value.filter(sheet =>
        scoringSheetOptions.find(opt => opt.value === sheet)?.isPreliminary
      );
    }

    setSelectedSheets(finalValue);
  };

  useEffect(() => {
    if (clusterIds.length > 0) {
      // Check if all selected clusters are the same type
      const clusterTypes = clusterIds.map(cId => {
        const cluster = clusters?.find(c => c.id === cId);
        return getClusterType(cluster);
      });

      const allSameType = clusterTypes.every(t => t === clusterTypes[0]);

      if (allSameType) {
        const clusterType = clusterTypes[0];
        if (clusterType === 'championship') {
          setSelectedSheets(["championshipSS"]);
        } else if (clusterType === 'redesign') {
          setSelectedSheets(["redesignSS"]);
        } else if (clusterType === 'preliminary') {
          // For preliminary, allow multiple sheets
          setSelectedSheets(["presSS", "journalSS", "mdoSS"]);
        }
      } else {
        // Mixed cluster types - only allow preliminary sheets
        setSelectedSheets(["presSS", "journalSS", "mdoSS"]);
      }
    } else if (clusterIds.length === 0) {
      // Reset when no cluster selected
      setSelectedSheets([]);
    }
  }, [clusterIds, clusters]);

  const handleCloseDropdown = (type: string, e?: any) => {
    e.stopPropagation();
    if (type === "scoresheet") {
      setScoreSheetsSelectIsOpen(false);
    }
  };

  const title = mode === "new" ? "New Judge" : "Edit Judge";
  const buttonText = mode === "new" ? "Create Judge" : "Update Judge";

  return (
    <Modal
      open={open}
      handleClose={handleCloseModal}
      title={title}
    >
      <Container sx={{ 
        p: { xs: 2, sm: 3 }, 
        maxWidth: { xs: "100%", sm: "500px" }
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "left",
          }}
        >
          <TextField
            required
            label="First Name"
            variant="outlined"
            sx={{ 
              mt: { xs: 1, sm: 1 }, 
              width: { xs: "100%", sm: 350 },
              "& .MuiInputLabel-root": { fontSize: { xs: "0.9rem", sm: "1rem" } },
              "& .MuiOutlinedInput-input": { fontSize: { xs: "0.9rem", sm: "1rem" } }
            }}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            required
            label="Last Name"
            variant="outlined"
            sx={{
              mt: { xs: 2, sm: 3 },
              width: { xs: "100%", sm: 350 },
              "& .MuiInputLabel-root": { fontSize: { xs: "0.9rem", sm: "1rem" } },
              "& .MuiOutlinedInput-input": { fontSize: { xs: "0.9rem", sm: "1rem" } }
            }}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <TextField
            required
            label="Email"
            variant="outlined"
            sx={{ 
              mt: { xs: 2, sm: 3 }, 
              width: { xs: "100%", sm: 350 },
              "& .MuiInputLabel-root": { fontSize: { xs: "0.9rem", sm: "1rem" } },
              "& .MuiOutlinedInput-input": { fontSize: { xs: "0.9rem", sm: "1rem" } }
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Phone Number"
            variant="outlined"
            sx={{ 
              mt: { xs: 2, sm: 3 }, 
              width: { xs: "100%", sm: 350 },
              "& .MuiInputLabel-root": { fontSize: { xs: "0.9rem", sm: "1rem" } },
              "& .MuiOutlinedInput-input": { fontSize: { xs: "0.9rem", sm: "1rem" } }
            }}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <FormControl
            required
            sx={{
              width: { xs: "100%", sm: 350 },
              mt: { xs: 2, sm: 3 },
            }}
          >
            <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>Cluster</InputLabel>
            <Select
              multiple
              value={clusterIds}
              label="Cluster"
              disabled={isChampionshipOrRedesignJudge}
              sx={{
                textAlign: "left",
                fontSize: { xs: "0.9rem", sm: "1rem" }
              }}
              onChange={(e) => {
                const newClusterIds = typeof e.target.value === 'string'
                  ? e.target.value.split(',').map(Number)
                  : e.target.value as number[];
                setClusterIds(newClusterIds);
              }}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((cId) => {
                    const cluster = clusters?.find(c => c.id === cId);
                    return cluster ? (
                      <Chip
                        key={cId}
                        label={cluster.cluster_name}
                        size="small"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {clusters
                ?.filter(cluster => {
                  // In edit mode, only show preliminary clusters (never show championship/redesign)
                  if (mode === "edit") {
                    return getClusterType(cluster) === 'preliminary';
                  }
                  return true;
                })
                ?.map((clusterItem) => {
                  const clusterType = clusterItem.cluster_type ||
                    (clusterItem.cluster_name?.toLowerCase().includes('championship') ? 'championship' :
                     clusterItem.cluster_name?.toLowerCase().includes('redesign') ? 'redesign' : 'preliminary');

                  return (
                    <MenuItem key={clusterItem.id} value={clusterItem.id} sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                      <Checkbox
                        checked={clusterIds.includes(clusterItem.id)}
                        sx={{
                          padding: { xs: 0.5, sm: 1 },
                          "& .MuiSvgIcon-root": {
                            fontSize: { xs: "1.2rem", sm: "1.5rem" }
                          }
                        }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span>{clusterItem.cluster_name}</span>
                        <Chip
                          label={clusterType.charAt(0).toUpperCase() + clusterType.slice(1)}
                          size="small"
                          sx={{
                            ml: 1,
                            height: 20,
                            fontSize: "0.7rem",
                            backgroundColor:
                              clusterType === 'championship' ? theme.palette.warning.light :
                              clusterType === 'redesign' ? theme.palette.info.light :
                              theme.palette.success.light,
                            color:
                              clusterType === 'championship' ? theme.palette.warning.dark :
                              clusterType === 'redesign' ? theme.palette.info.dark :
                              theme.palette.success.dark,
                          }}
                        />
                      </Box>
                    </MenuItem>
                  );
                })}
            </Select>
            {errors.cluster && !errorMessage && (
              <FormHelperText error sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                {isChampionshipOrRedesignJudge 
                  ? "Cannot change cluster type for championship/redesign judges."
                  : "Please select a cluster."}
              </FormHelperText>
            )}
            {errorMessage && (
              <FormHelperText error sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                {errorMessage}
              </FormHelperText>
            )}
            {isChampionshipOrRedesignJudge && (
              <FormHelperText sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" }, color: "text.secondary" }}>
                Cluster type cannot be changed for championship/redesign judges.
              </FormHelperText>
            )}
          </FormControl>
          {(isChampionshipCluster || isRedesignCluster) && (
            <Box sx={{ 
              mt: { xs: 2, sm: 3 },
              mb: 2,
              p: 1.5, 
              bgcolor: isChampionshipCluster ? 'success.light' : 'warning.light',
              borderRadius: 1,
              fontSize: '0.875rem',
              color: isChampionshipCluster ? 'success.dark' : 'warning.dark',
              fontWeight: 500,
              border: `1px solid ${isChampionshipCluster ? theme.palette.success.main : theme.palette.warning.main}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              width: { xs: "100%", sm: 350 }
            }}>
              {isChampionshipCluster ? 'Championship Cluster: Only Championship scoresheets are allowed' : 
               'Redesign Cluster: Only Redesign scoresheets are allowed'}
            </Box>
          )}
          
          <FormControl sx={{ 
            mt: { xs: 1, sm: 2 }, 
            width: { xs: "100%", sm: 350 }, 
            position: "relative" 
          }}>
            <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>Score Sheets</InputLabel>
            <Select
              multiple
              value={selectedSheets}
              open={scoreSheetsSelectIsOpen}
              onClose={() => setScoreSheetsSelectIsOpen(false)}
              onOpen={() => setScoreSheetsSelectIsOpen(true)}
              onChange={handleScoringSheetsChange}
              input={<OutlinedInput label="Scoring Sheets" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }} />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0.25, sm: 0.5 } }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={
                        scoringSheetOptions.find((o) => o.value === value)
                          ?.label
                      }
                      sx={{ 
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        height: { xs: "24px", sm: "32px" }
                      }}
                    />
                  ))}
                </Box>
              )}
            >
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <IconButton
                  onClick={(e) => handleCloseDropdown("scoresheet", e)}
                  sx={{
                    color: "rgba(0, 0, 0, 0.54)",
                  }}
                  aria-label="Close dropdown"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              {scoringSheetOptions.map((option) => {
                const isDisabled = isScoresheetDisabled(option);
                let disabledReason = "";
                
                if (isChampionshipCluster && option.value !== "championshipSS") {
                  disabledReason = "Championship clusters can only have Championship scoresheets";
                } else if (isRedesignCluster && option.value !== "redesignSS") {
                  disabledReason = "Redesign clusters can only have Redesign scoresheets";
                } else if (isPreliminaryCluster && !option.isPreliminary) {
                  disabledReason = "Preliminary clusters cannot have Redesign or Championship scoresheets";
                }
                
                return (
                  <MenuItem 
                    key={option.value} 
                    value={option.value} 
                    disabled={isDisabled}
                    sx={{ 
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      opacity: isDisabled ? 0.5 : 1,
                      "&.Mui-disabled": {
                        color: theme.palette.grey[500]
                      }
                    }}
                  >
                    <Checkbox 
                      checked={selectedSheets.includes(option.value)} 
                      disabled={isDisabled}
                      sx={{ 
                        padding: { xs: 0.5, sm: 1 },
                        "& .MuiSvgIcon-root": { 
                          fontSize: { xs: "1.2rem", sm: "1.5rem" } 
                        },
                        "&.Mui-disabled": {
                          color: theme.palette.grey[400]
                        }
                      }}
                    />
                    <ListItemText 
                      primary={
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            color: isDisabled ? theme.palette.grey[500] : "inherit"
                          }}>
                            {option.label}
                          </Typography>
                          {isDisabled && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: "block", 
                                color: theme.palette.error.main,
                                fontSize: "0.75rem",
                                mt: 0.5
                              }}
                            >
                              {disabledReason}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </MenuItem>
                );
              })}
            </Select>
            {errors.scoreSheets && (
              <FormHelperText error sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                {isChampionshipCluster 
                  ? "Championship clusters can only have Championship scoresheets"
                  : isRedesignCluster 
                  ? "Redesign clusters can only have Redesign scoresheets"
                  : "Preliminary clusters cannot have Redesign or Championship scoresheets"
                }
              </FormHelperText>
            )}
            <FormHelperText sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>Select one or more scoring sheets</FormHelperText>
          </FormControl>
          <FormControl
            required
            sx={{
              width: { xs: "100%", sm: 350 },
              mt: { xs: 2, sm: 3 },
            }}
          >
            <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>Title</InputLabel>
            <Select
              value={selectedTitle}
              label="Title"
              sx={{ 
                textAlign: "left",
                fontSize: { xs: "0.9rem", sm: "1rem" }
              }}
              onChange={(e) => setSelectedTitle(Number(e.target.value))}
            >
              {titleOptions?.map((title) => (
                <MenuItem key={title.value} value={title.value} sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  {title.label}
                </MenuItem>
              ))}
            </Select>
            {errors.titles && (
              <FormHelperText sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>Please select a title.</FormHelperText>
            )}
          </FormControl>

          <Button
            type="submit"
            sx={{
              width: { xs: "100%", sm: 130 },
              height: { xs: 40, sm: 44 },
              bgcolor: theme.palette.success.main,
              color: "#fff",
              mt: { xs: 2, sm: 3 },
              textTransform: "none",
              borderRadius: "12px",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              fontWeight: 600,
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
      </Container>
    </Modal>
  );
}
