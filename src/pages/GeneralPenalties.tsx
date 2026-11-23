import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Stack,    
  Divider,  
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/primary_stores/authStore";
import { useParams, useNavigate } from "react-router-dom";
import { useTeamStore } from "../store/primary_stores/teamStore";
import theme from "../theme";
import React from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useMapScoreSheetStore from "../store/map_stores/mapScoreSheetStore";
import { useScoreSheetStore } from "../store/primary_stores/scoreSheetStore";
import AreYouSureModal from "../components/Modals/AreYouSureModal";
import { generalPenaltiesQuestions } from "../data/generalPenaltiesQuestions";
import { penaltyCountFromPoints } from "../utils/penalties";
import { useScoreDraft } from "../utils/useScoreDraft";
import DraftRestoredNotice from "../components/DraftRestoredNotice";
import PenaltyCategory from "../components/PenaltyCategory";
import { ScoreSheet } from "../types";
import { useJudgeStore } from "../store/primary_stores/judgeStore";

export default function GeneralPenalties() {
  // --- Stores, routing, params ---
  const { role } = useAuthStore();
  const { judgeId, teamId } = useParams();
  const { team, fetchTeamById } = useTeamStore();
  const { scoreSheetId, fetchScoreSheetId } = useMapScoreSheetStore();
  const {
    scoreSheet,
    fetchScoreSheetById,
    isLoadingScoreSheet,
    updateScores,
    editScoreSheet,
  } = useScoreSheetStore();
  const { judgeDisqualifyTeam } = useJudgeStore();
  const navigate = useNavigate();

  // Parse route ids once for convenience
  const parsedJudgeId = judgeId ? parseInt(judgeId, 10) : null;
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;

  // --- Local UI state (expand/collapse sections) ---
  const [openPresentation, setOpenPresentation] = useState(false);
  const [openJournal, setOpenJournal] = useState(false);
  const [openMachineSpecifications, setOpenMachineSpecifications] = useState(false);
  const [openDisqualifications, setOpenDisqualifications] = useState(false);

  // --- Modals ---
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const [openConfirmDisqualification, setOpenConfirmDisqualification] = useState(false);

  // Penalty form state: count/yes-no per question (1..7)
  const [penaltyState, setPenaltyState] = useState<{ [key: number]: number }>(
    Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, 0]))
  );

  // If a judge opens a link for a different judge, redirect them to their own sheet
  useEffect(() => {
    if (role?.user_type === 3 && parsedJudgeId !== role.user.id) {
      navigate(`/penalties/${role.user.id}/${parsedTeamId}/`);
    }
  }, [parsedJudgeId]);

  // Fetch team info for subtitle
  useEffect(() => {
    if (parsedTeamId) {
      fetchTeamById(parsedTeamId);
    }
  }, [parsedTeamId, fetchTeamById]);

  // Which judge+team's sheet has finished loading. The store keeps the last
  // sheet in session storage, so it may briefly hold another team's sheet.
  const sheetKey = parsedJudgeId && parsedTeamId ? `${parsedJudgeId}:${parsedTeamId}:5` : null;
  const [loadedSheetKey, setLoadedSheetKey] = useState<string | null>(null);

  // Resolve scoreSheetId mapping for this judge+team (sheetType 5 = general penalties)
  useEffect(() => {
    if (parsedJudgeId && parsedTeamId) {
      const key = `${parsedJudgeId}:${parsedTeamId}:5`;
      fetchScoreSheetId(parsedJudgeId, parsedTeamId, 5)
        .then(() => {
          const id = useMapScoreSheetStore.getState().scoreSheetId;
          return id ? fetchScoreSheetById(id).then(() => setLoadedSheetKey(key)) : undefined;
        })
        .catch((error) => console.error("Error loading general penalties sheet:", error));
    }
  }, [parsedTeamId, parsedJudgeId, fetchScoreSheetId, fetchScoreSheetById]);

  // Load the score sheet after we know the id
  useEffect(() => {
    if (scoreSheetId) {
      fetchScoreSheetById(scoreSheetId);
    }
  }, [scoreSheetId, fetchScoreSheetById]);

  // Populate local penalty state from the scoreSheet.
  // NOTE: Stored fields are total points; we display counts, so divide by per-occurrence point value.
  useEffect(() => {
    if (scoreSheet) {
      const newPenaltyState: { [key: number]: number } = {};

      generalPenaltiesQuestions.forEach((question) => {
        newPenaltyState[question.id] = penaltyCountFromPoints(
          scoreSheet[question.field as keyof ScoreSheet],
          question
        );
      });

      setPenaltyState(newPenaltyState);
    } else {
      setPenaltyState({});
    }
  }, [scoreSheet, parsedJudgeId, parsedTeamId]);

  // Keep ticked-but-unsaved penalties across a refresh (#11)
  const { restored, markSaved, discardDraft } = useScoreDraft({
    draftKey: sheetKey,
    ready: !!sheetKey && loadedSheetKey === sheetKey && !!scoreSheet,
    values: penaltyState,
    setValues: setPenaltyState,
  });

  // Convert current counts to scored fields (points) before save/submit
  const calculatePenalties = () => {
    return generalPenaltiesQuestions.reduce((acc, question) => {
      const fieldValue = penaltyState[question.id];
      if (fieldValue !== undefined) {
        acc[question.field] = fieldValue * question.pointValue;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  // Save as draft (no submission)
  const handleSavePenalties = async () => {
    if (scoreSheet) {
      const penalties = calculatePenalties();
      try {
        await updateScores({ id: scoreSheet.id, ...penalties });
        markSaved();
      } catch {
        // updateScores already shows the error toast; the draft is kept.
      }
    }
  };

  // Submit final and go back
  const handleSubmitPenalties = async () => {
    try {
      if (scoreSheet) {
        const penalties = calculatePenalties();
        await editScoreSheet({
          id: scoreSheet.id,
          sheetType: scoreSheet.sheetType,
          isSubmitted: true,
          ...penalties,
        });
        markSaved();
      }
      setOpenAreYouSure(false);
      navigate(-1);
    } catch (error) {
      console.error(error);
    }
  };

  // Simple handlers for checkbox / increment / decrement controls
  function handleCheckboxChange(field: number) {
    setPenaltyState((prevState) => ({
      ...prevState,
      [field]: prevState[field] === 1 ? 0 : 1,
    }));
  }
  function handleIncrement(field: number, upperBound: number) {
    setPenaltyState((prevState: any) => ({
      ...prevState,
      [field]: Math.min(prevState[field] + 1, upperBound),
    }));
  }
  function handleDecrement(field: number, lowerBound: number) {
    setPenaltyState((prevState: any) => ({
      ...prevState,
      [field]: Math.max(prevState[field] - 1, lowerBound),
    }));
  }

  // Disqualification flow: mark team and submit penalties
  async function handleDisqualify() {
    if (parsedTeamId) {
      await judgeDisqualifyTeam(parsedTeamId, true);
      fetchTeamById(parsedTeamId);
      handleSubmitPenalties();
    }
  }

  // Group questions by category for tidy sections
  const journalPenalties = generalPenaltiesQuestions.filter((p) => p.penaltyType === "Journal");
  const presentationPenalties = generalPenaltiesQuestions.filter((p) => p.penaltyType === "Presentation");
  const machineSpecificationPenalties = generalPenaltiesQuestions.filter((p) => p.penaltyType === "Machine Specification");

  // Loading state: keep original behavior
  return isLoadingScoreSheet ? (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <CircularProgress />
    </Box>
  ) : (
    // Page background and spacing (aligns with Admin/Public pages)
    <Box sx={{ pb: 8, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      {/* Navigation back to judging dashboard - aligned with navbar */}
      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 1, sm: 2 },
          mt: { xs: 1, sm: 2 },
          mb: 1,
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
              transform: "translateX(-2px)",
            },
          }}
        >
          Back to Judging Dashboard
        </Button>
      </Container>

      <Container maxWidth="lg" sx={{ pt: 2 }}>

        {/* Card wrapper: title, subtitle, helper text, actions, and table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${theme.palette.grey[300]}`,
            backgroundColor: "#fff",
            opacity: scoreSheet?.isSubmitted ? 0.7 : 1,
            pointerEvents: scoreSheet?.isSubmitted ? 'none' : 'auto',
          }}
        >
          {/* Title + Team */}
          <Stack spacing={1} sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, textAlign: "center" }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                color: theme.palette.success.main 
              }}
            >
              General Penalties
            </Typography>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
            >
              {team?.team_name ? `Team: ${team.team_name}` : "Loading team..."}
            </Typography>
          </Stack>

          <Divider />

          {restored && (
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
              <DraftRestoredNotice onDiscard={discardDraft} />
            </Box>
          )}

          {/* Helper text and Save action */}
          <Stack
            spacing={1.25}
            direction={{ xs: "column", sm: "row" }}
            sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                *Only enter a penalty if it occurred.
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                *Counters adjust the number of occurrences.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={handleSavePenalties}
              sx={{
                bgcolor: theme.palette.success.main,
                "&:hover": { bgcolor: theme.palette.success.dark },
                color: "#fff",
                minWidth: { xs: "100%", sm: 160 },
                height: { xs: 40, sm: 44 },
                textTransform: "none",
                borderRadius: 2,
                fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                fontWeight: 600,
              }}
            >
              Save
            </Button>
          </Stack>

          {/* Main content: categories table + disqualification section + submit */}
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
        
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
                boxShadow: "none",
                overflow: { xs: "auto", sm: "hidden" },
                width: "100%",
                "&::-webkit-scrollbar": {
                  height: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "#f1f1f1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#c1c1c1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: "#a8a8a8",
                },
              }}
            >
              <Table
                sx={{
                  minWidth: { xs: "600px", sm: "auto" },
                  "& td, & th": { 
                    borderColor: theme.palette.grey[200],
                    fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                    py: { xs: 0.75, sm: 1.25 },
                    px: { xs: 0.5, sm: 1 }
                  },
                }}
              >
                <TableBody>
                  {/* Journal Penalties */}
                  <PenaltyCategory
                    isOpen={openJournal}
                    toggleOpen={() => setOpenJournal(!openJournal)}
                    categoryTitle="Journal Penalties"
                    fields={journalPenalties.map((penalty) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled: false,
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={penaltyState}
                    onCheckboxChange={handleCheckboxChange}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                  />

                  {/* Presentation Penalties (note: some mutually exclusive options) */}
                  <PenaltyCategory
                    isOpen={openPresentation}
                    toggleOpen={() => setOpenPresentation(!openPresentation)}
                    categoryTitle="Presentation Penalties"
                    fields={presentationPenalties.map((penalty) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled:
                        (penalty.id == 2 && penaltyState[3] == 1) ||
                        (penalty.id == 3 && penaltyState[2] == 1),
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={penaltyState}
                    onCheckboxChange={handleCheckboxChange}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                  />

                  {/* Machine Specification Penalties */}
                  <PenaltyCategory
                    isOpen={openMachineSpecifications}
                    toggleOpen={() => setOpenMachineSpecifications(!openMachineSpecifications)}
                    categoryTitle="Machine Specification Penalties"
                    fields={machineSpecificationPenalties.map((penalty) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled: false,
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={penaltyState}
                    onCheckboxChange={handleCheckboxChange}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                  />

                  {/* Disqualification section (collapsible) */}
                  <React.Fragment>
                    <TableRow
                      sx={{
                        "& > *": { borderBottom: "unset" },
                        transition: "background-color 120ms ease",
                        cursor: "pointer",
                      }}
                      onClick={() => setOpenDisqualifications(!openDisqualifications)}
                    >
                      <TableCell sx={{ width: 56 }}>
                        <IconButton aria-label="expand row" size="small">
                          {openDisqualifications ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell component="th" scope="row" sx={{ cursor: "pointer" }}>
                        <Typography sx={{ 
                          fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                          fontWeight: 600,
                          cursor: "pointer"
                        }}>
                          Disqualification
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={openDisqualifications} timeout="auto" unmountOnExit>
                          <Box sx={{ pt: 1, pb: 1, pl: 0.75, pr: 0.75, flexDirection: "column" }}>
                            {/* Reasons list */}
                            <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Corporate logos without written permission. If permission to use a logo is granted, a
                                written letter of permission must be provided and be kept with the machine.
                              </Typography>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Safety issues as deemed by the Judging Committee.
                              </Typography>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Use of live animals, hazardous material (toxic, noxious, dangerous), explosives, or flames.
                              </Typography>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Use of profane, indecent or lewd expressions, offensive symbols, graphics, or language.
                              </Typography>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Any device requiring a combustion engine.
                              </Typography>
                              <Typography 
                                component="li" 
                                sx={{ 
                                  mb: 1.5,
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Unsafe machine or intentionally causing loose/flying objects to go outside set boundaries of the machine.
                              </Typography>
                              <Typography 
                                component="li"
                                sx={{ 
                                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                                  fontWeight: 400
                                }}
                              >
                                Damaging another team's machine.
                              </Typography>
                            </Box>
                          </Box>

                          {/* Disqualify action */}
                          <Box sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 1 }}>
                            <Button
                              variant="contained"
                              onClick={() => setOpenConfirmDisqualification(true)}
                              sx={{
                                bgcolor: theme.palette.error.main,
                                "&:hover": { bgcolor: theme.palette.error.dark },
                                color: "#fff",
                                textTransform: "none",
                                borderRadius: 2,
                              }}
                            >
                              Disqualify Team
                            </Button>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Submit controls */}
            <Button
              variant="contained"
              sx={{
                mt: { xs: 2, sm: 3 },
                bgcolor: theme.palette.success.main,
                "&:hover": { bgcolor: theme.palette.success.dark },
                color: "#fff",
                minWidth: { xs: "100%", sm: 200 },
                height: { xs: 40, sm: 44 },
                textTransform: "none",
                borderRadius: 2,
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 600,
              }}
              onClick={() => setOpenAreYouSure(true)}
            >
              Submit
            </Button>

            {/* Confirmation modals */}
            <AreYouSureModal
              open={openAreYouSure}
              handleClose={() => setOpenAreYouSure(false)}
              title="Are you sure you want to submit?"
              handleSubmit={() => handleSubmitPenalties()}
            />

            <AreYouSureModal
              open={openConfirmDisqualification}
              handleClose={() => setOpenConfirmDisqualification(false)}
              title={`Are you sure you want to disqualify ${team?.team_name}?`}
              handleSubmit={() => handleDisqualify()}
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
