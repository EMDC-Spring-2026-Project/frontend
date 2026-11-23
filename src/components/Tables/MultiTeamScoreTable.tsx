// ==============================
// Component: MultiTeamScoreTable
// Advanced multi-team scoring interface with expandable criteria and bulk operations.
// Supports draft saving, final submission, and responsive design for judges.
// ==============================

// ==============================
// React Core
// ==============================
import * as React from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

// ==============================
// Router
// ==============================
import { useNavigate } from "react-router-dom";

// ==============================
// UI Libraries & Theme
// ==============================
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Collapse,
  IconButton,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../theme";
import toast from "react-hot-toast";
import ScoreInput from "../ScoreInput";
import { useFieldErrors } from "../../utils/useFieldErrors";

// ==============================
// Store Hooks
// ==============================
import { bulkScoreKey, useScoreSheetStore } from "../../store/primary_stores/scoreSheetStore";
import BulkScoreLoadError from "./BulkScoreLoadError";
import { useScoreDraft } from "../../utils/useScoreDraft";
import DraftRestoredNotice from "../DraftRestoredNotice";
import { useMapScoreSheetStore } from "../../store/map_stores/mapScoreSheetStore";

// ==============================
// Types
// ==============================
import { Question } from "../../types";

// ==============================
// Local Components
// ==============================
import AreYouSureModal from "../Modals/AreYouSureModal";

type IMultiTeamScoreSheetProps = {
  sheetType: number;
  title: string;
  teams: { id: number; name: string }[];
  questions: Question[];
  seperateJrAndSr: boolean;
  judgeId: number | null;
  isDataReady?: boolean;
};

export default function MultiTeamScoreSheet({
  sheetType,
  title,
  teams,
  questions,
  judgeId,
  seperateJrAndSr,
  isDataReady = false,
}: IMultiTeamScoreSheetProps) {
  const navigate = useNavigate();

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  // Tracks expand/collapse state per question row
  const [openRows, setOpenRows] = React.useState<{ [key: number]: boolean }>(
    {}
  );
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const { hasFieldErrors, setFieldError } = useFieldErrors();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Form data state: teamId -> questionId -> value
  const [formData, setFormData] = useState<{
    [teamId: number]: {
      [questionId: number]: number | string | undefined;
    };
  }>({});

  // Score sheet store for data management - only subscribe to what we need
  const storedSheets = useScoreSheetStore(
    (state) => state.multipleScoreSheets
  );
  const bulkLoad = useScoreSheetStore((state) => state.bulkLoad);
  const fetchMultipleScoreSheets = useScoreSheetStore(
    (state) => state.fetchMultipleScoreSheets
  );
  const updateMultipleScores = useScoreSheetStore(
    (state) => state.updateMultipleScores
  );
  const submitMultipleScoreSheets = useScoreSheetStore(
    (state) => state.submitMultipleScoreSheets
  );

  // Mapping store to refresh judge dashboard after updates
  const fetchScoreSheetsByJudge = useMapScoreSheetStore(
    (state) => state.fetchScoreSheetsByJudge
  );

  // Memoize team IDs to prevent unnecessary re-fetches
  const teamIds = useMemo(() => teams.map((team) => team.id), [teams]);
  const loadState = bulkLoad?.key === bulkScoreKey(teamIds, judgeId ?? 0, sheetType)
    ? bulkLoad.state : undefined;
  const multipleScoreSheets = loadState === "ready" ? storedSheets : null;

  // Filter teams that have score sheets available
  const filteredTeams = useMemo(() => {
    if (!multipleScoreSheets) return [];
    return teams.filter((team) =>
      multipleScoreSheets.some((sheet) => sheet.teamId === team.id)
    );
  }, [teams, multipleScoreSheets]);

  // Fetch score sheets when component mounts or when teamIds change
  const loadSheets = useCallback(() => {
    if (teamIds.length > 0 && judgeId) {
      void fetchMultipleScoreSheets(teamIds, judgeId, sheetType).catch(() => {});
    }
  }, [teamIds, judgeId, fetchMultipleScoreSheets, sheetType]);
  useEffect(loadSheets, [loadSheets]);

  // Memoize sheet IDs string for comparison to prevent unnecessary formData updates
  const sheetIdsString = useMemo(() => {
    if (!multipleScoreSheets || multipleScoreSheets.length === 0) return "";
    return multipleScoreSheets
      .map((sheet) => `${sheet.teamId}-${sheet.id}`)
      .sort()
      .join(",");
  }, [multipleScoreSheets]);

  const sheetIdsRef = useRef<string>("");

  // Initialize form data from fetched score sheets - only when sheets change
  useEffect(() => {
    if (!multipleScoreSheets || multipleScoreSheets.length === 0) return;

    if (sheetIdsString !== sheetIdsRef.current) {
      sheetIdsRef.current = sheetIdsString;

      const newFormData: {
        [teamId: number]: {
          [questionId: number]: number | string | undefined;
        };
      } = {};

      multipleScoreSheets.forEach((sheet) => {
        if (!sheet || sheet.teamId === undefined) return;

        newFormData[sheet.teamId] = {
          1: sheet.field1,
          2: sheet.field2,
          3: sheet.field3,
          4: sheet.field4,
          5: sheet.field5,
          6: sheet.field6,
          7: sheet.field7,
          8: sheet.field8,
          9: sheet.field9,
        };
      });

      filteredTeams.forEach((team) => {
        if (!newFormData[team.id]) {
          newFormData[team.id] = {
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
            5: undefined,
            6: undefined,
            7: undefined,
            8: undefined,
            9: undefined,
          };
        }
      });

      setFormData(newFormData);
    }
  }, [sheetIdsString, multipleScoreSheets, filteredTeams]);

  const handleToggle = useCallback((id: number) => {
    setOpenRows((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  }, []);

  const handleExpandAllRows = useCallback(() => {
    const expanded = questions.reduce(
      (acc, q) => ({ ...acc, [q.id]: true }),
      {}
    );
    setOpenRows(expanded);
  }, [questions]);

  const handleCollapseAllRows = useCallback(() => {
    const closed = questions.reduce(
      (acc, q) => ({ ...acc, [q.id]: false }),
      {}
    );
    setOpenRows(closed);
  }, [questions]);

  const handleScoreChange = useCallback(
    (teamId: number, questionId: number, value: number | string | undefined) => {
      setFormData((prev) => ({
        ...prev,
        [teamId]: {
          ...(prev[teamId] || {}),
          [questionId]: value,
        },
      }));
    },
    []
  );

  // Keep typed-but-unsaved scores across a refresh (#11)
  const draftKey = judgeId && teamIds.length
    ? `multi:${judgeId}:${sheetType}:${[...teamIds].sort((a, b) => a - b).join(",")}`
    : null;
  const { restored, markSaved, discardDraft } = useScoreDraft({
    draftKey,
    ready: loadState === "ready" && !!multipleScoreSheets,
    values: formData,
    setValues: setFormData,
  });

  const teamToSheetMap = useMemo(() => {
    if (!multipleScoreSheets) return new Map();
    return new Map(multipleScoreSheets.map((sheet) => [sheet.teamId, sheet]));
  }, [multipleScoreSheets]);

  const handleSaveScoreSheets = useCallback(async () => {
    if (!multipleScoreSheets || multipleScoreSheets.length === 0) return;
    if (hasFieldErrors) {
      toast.error("Fix the scores marked in red before saving.");
      return;
    }

    const updatedSheets: Array<{
      id: number;
      field1?: number | string;
      field2?: number | string;
      field3?: number | string;
      field4?: number | string;
      field5?: number | string;
      field6?: number | string;
      field7?: number | string;
      field8?: number | string;
      field9?: string;
    }> = [];

    for (const team of filteredTeams) {
      const sheet = teamToSheetMap.get(team.id);
      if (sheet && formData[team.id]) {
        updatedSheets.push({
          id: sheet.id,
          field1: formData[team.id][1],
          field2: formData[team.id][2],
          field3: formData[team.id][3],
          field4: formData[team.id][4],
          field5: formData[team.id][5],
          field6: formData[team.id][6],
          field7: formData[team.id][7],
          field8: formData[team.id][8],
          field9: formData[team.id][9]?.toString(),
        });
      }
    }

    if (updatedSheets.length > 0) {
      await updateMultipleScores(updatedSheets);
      markSaved();
      toast.success("Scores saved successfully!");

      if (judgeId) {
        fetchScoreSheetsByJudge(judgeId).catch(() => {
          // Silently fail
        });
      }
    }
  }, [
    multipleScoreSheets,
    filteredTeams,
    formData,
    teamToSheetMap,
    updateMultipleScores,
    judgeId,
    fetchScoreSheetsByJudge,
    hasFieldErrors,
  ]);

  const allFieldsFilled = useMemo(() => {
    if (!multipleScoreSheets || multipleScoreSheets.length === 0) return false;

    for (const team of filteredTeams) {
      const data = formData[team.id];
      if (!data) return false;

      const complete = Object.keys(data).every((key) => {
        const id = Number(key);
        return (
          id === 9 ||
          (data[id] !== undefined && data[id] !== "" && data[id] !== 0)
        );
      });

      if (!complete) return false;
    }

    return true;
  }, [multipleScoreSheets, filteredTeams, formData]);

  const handleSubmit = useCallback(async () => {
    if (!multipleScoreSheets || multipleScoreSheets.length === 0) return;
    if (isSubmittingRef.current) return;

    const updatedSheets: Array<any> = [];

    for (const team of filteredTeams) {
      const sheet = teamToSheetMap.get(team.id);
      if (sheet && formData[team.id]) {
        updatedSheets.push({
          id: sheet.id,
          sheetType,
          isSubmitted: true,
          field1: formData[team.id][1],
          field2: formData[team.id][2],
          field3: formData[team.id][3],
          field4: formData[team.id][4],
          field5: formData[team.id][5],
          field6: formData[team.id][6],
          field7: formData[team.id][7],
          field8: formData[team.id][8],
          field9: formData[team.id][9]?.toString(),
        });
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (updatedSheets.length > 0) {
        await submitMultipleScoreSheets(updatedSheets);
        markSaved();

        if (judgeId) {
          fetchScoreSheetsByJudge(judgeId).catch(() => {});
        }
      }
      setOpenAreYouSure(false);
      navigate(-1);
    } catch (error) {
      console.error("Unable to submit all team scoresheets:", error);
      setOpenAreYouSure(false);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    multipleScoreSheets,
    filteredTeams,
    formData,
    teamToSheetMap,
    sheetType,
    submitMultipleScoreSheets,
    judgeId,
    fetchScoreSheetsByJudge,
    navigate,
  ]);

  if (teamIds.length > 0 && (!loadState || loadState === "loading")) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Loading team scoresheets...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (loadState === "error") {
    return <BulkScoreLoadError message="Team scoresheets could not be loaded." onRetry={loadSheets} />;
  }

  if (multipleScoreSheets && multipleScoreSheets.length === 0) {
    return (
      <>
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
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No scoresheets available for this judge and sheet type.
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Please ensure scoresheets have been created for the teams in this
              judge&apos;s cluster.
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  // Small helper for criteria block (used in mobile + desktop)
  const renderCriteriaBlock = (question: Question) => {
    if (question.id === 9) return null;

    return (
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1.5, sm: 3 },
          flexDirection: { xs: "column", sm: "row" },
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        {/* Criteria 1 */}
        <Box
          sx={{
            bgcolor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[200]}`,
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            flex: 1,
            minWidth: { xs: "200px", sm: "250px" },
          }}
        >
          <Typography
            sx={{
              mt: { xs: 0.5, sm: 1 },
              fontWeight: 800,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            {question.criteria1Points}
          </Typography>
          {seperateJrAndSr && question.id === 4 ? (
            <>
              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                }}
              >
                Jr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria1Junior}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                  mt: { xs: 0.5, sm: 1 },
                }}
              >
                Sr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria1Senior}
              </Typography>
            </>
          ) : (
            <Typography
              sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
            >
              {question.criteria1}
            </Typography>
          )}
        </Box>

        {/* Criteria 2 */}
        <Box
          sx={{
            bgcolor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[200]}`,
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            flex: 1,
            minWidth: { xs: "200px", sm: "250px" },
          }}
        >
          <Typography
            sx={{
              mt: { xs: 0.5, sm: 1 },
              fontWeight: 800,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            {question.criteria2Points}
          </Typography>

          {seperateJrAndSr && question.id === 4 ? (
            <>
              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                }}
              >
                Jr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria2Junior}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                  mt: { xs: 0.5, sm: 1 },
                }}
              >
                Sr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria2Senior}
              </Typography>
            </>
          ) : (
            <Typography
              sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
            >
              {question.criteria2}
            </Typography>
          )}
        </Box>

        {/* Criteria 3 */}
        <Box
          sx={{
            bgcolor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[200]}`,
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            flex: 1,
            minWidth: { xs: "200px", sm: "250px" },
          }}
        >
          <Typography
            sx={{
              mt: { xs: 0.5, sm: 1 },
              fontWeight: 800,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            {question.criteria3Points}
          </Typography>

          {seperateJrAndSr && question.id === 4 ? (
            <>
              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                }}
              >
                Jr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria3Junior}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                  fontWeight: 800,
                  mb: { xs: 0.5, sm: 1 },
                  mt: { xs: 0.5, sm: 1 },
                }}
              >
                Sr. Div.
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
              >
                {question.criteria3Senior}
              </Typography>
            </>
          ) : (
            <Typography
              sx={{ fontSize: { xs: "0.75rem", sm: "0.9375rem" } }}
            >
              {question.criteria3}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <>
      {/* Back button */}
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
        {loadState === "ready" && filteredTeams.length < teams.length && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Some teams don’t have scoresheets. You can score the teams shown.
          </Alert>
        )}
      </Container>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Page title */}
        <Typography
          variant="h1"
          sx={{
            mt: { xs: 2, sm: 4 },
            mb: { xs: 1.5, sm: 2 },
            fontWeight: "bold",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
            textAlign: "center",
          }}
        >
          {title}
        </Typography>

        {/* Main form container */}
        <Container
          component="form"
          sx={{
            width: "auto",
            maxWidth: { xs: "100%", sm: "95%", md: "90%" },
            p: { xs: 2, sm: 3 },
            bgcolor: "#fff",
            borderRadius: 3,
            border: `1px solid ${theme.palette.grey[300]}`,
            mb: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity:
              isDataReady && filteredTeams.length > 0
                ? 1
                : 0,
            transform:
              isDataReady && filteredTeams.length > 0
                ? "translateY(0)"
                : "translateY(10px)",
            transition:
              "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
          }}
        >
          {restored && <DraftRestoredNotice onDiscard={discardDraft} />}

          {/* Action buttons */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 1, sm: 1.5 },
              mb: { xs: 1.5, sm: 2 },
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "flex-start" },
              width: "100%",
            }}
          >
            <Button
              variant="contained"
              onClick={handleSaveScoreSheets}
              sx={{
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
            >
              Save All
            </Button>

            <Button
              variant="contained"
              onClick={handleExpandAllRows}
              sx={{
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
            >
              Expand Rows
            </Button>

            <Button
              variant="contained"
              onClick={handleCollapseAllRows}
              sx={{
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
            >
              Collapse All
            </Button>
          </Box>

          {/* ===== MOBILE LAYOUT (stacked cards) ===== */}
          {isMobile ? (
            <Box sx={{ width: "100%", mt: 1 }}>
              {questions.map((question) => (
                <Box
                  key={question.id}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.grey[200]}`,
                    overflow: "hidden",
                    bgcolor: "#fafafa",
                  }}
                >
                  {/* Question header row */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      py: 0.75,
                      cursor: "pointer",
                    }}
                    onClick={() => handleToggle(question.id)}
                  >
                    <IconButton size="small">
                      {openRows[question.id] ? (
                        <KeyboardArrowUpIcon />
                      ) : (
                        <KeyboardArrowDownIcon />
                      )}
                    </IconButton>
                    <Typography
                      sx={{
                        ml: 0.5,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {question.questionText}
                    </Typography>
                  </Box>

                  <Collapse in={openRows[question.id]} timeout="auto">
                    <Box
                      sx={{
                        px: 1.25,
                        pb: 1.25,
                        pt: 0.5,
                      }}
                    >
                      {/* Criteria block */}
                      {renderCriteriaBlock(question)}

                      {/* Per-team inputs */}
                      <Box sx={{ mt: 1.5 }}>
                        {filteredTeams.map((team) => (
                          <Box
                            key={team.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              py: 0.75,
                              px: 0.75,
                              mb: 0.75,
                              borderRadius: 2,
                              bgcolor: "#fff",
                              border: `1px solid ${theme.palette.grey[200]}`,
                            }}
                          >
                            <Box
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                mr: 1,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={team.name}
                              >
                                {team.name}
                              </Typography>
                            </Box>

                            {question.id !== 9 ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <ScoreInput
                                  size="small"
                                  slotProps={{
                                    htmlInput: {
                                      "aria-label": `${team.name}: ${question.questionText}`,
                                    },
                                  }}
                                  value={formData[team.id]?.[question.id]}
                                  low={question.lowPoints}
                                  high={question.highPoints}
                                  onClick={(e) => e.stopPropagation()}
                                  onScoreChange={(value) =>
                                    handleScoreChange(team.id, question.id, value)
                                  }
                                  onErrorChange={(hasError) =>
                                    setFieldError(`${team.id}-${question.id}`, hasError)
                                  }
                                  sx={{
                                    "& .MuiFormHelperText-root": {
                                      mx: 0,
                                      fontSize: "0.65rem",
                                      lineHeight: 1.2,
                                    },
                                    width: "70px",
                                    "& .MuiInputBase-input": {
                                      fontSize: "0.75rem",
                                      padding: "6px",
                                    },
                                  }}
                                />
                                {formData[team.id] && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {formData[team.id][question.id] ===
                                      undefined ||
                                    formData[team.id][question.id] === "" ||
                                    formData[team.id][question.id] === 0 ||
                                    formData[team.id][question.id] ===
                                      null ? (
                                      <CloseIcon
                                        fontSize="small"
                                        sx={{ color: "red" }}
                                      />
                                    ) : (
                                      <CheckIcon
                                        fontSize="small"
                                        sx={{ color: "green" }}
                                      />
                                    )}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              <TextField
                                size="small"
                                multiline
                                placeholder="Comments"
                                value={
                                  formData[team.id] &&
                                  formData[team.id][question.id] !== undefined
                                    ? formData[team.id][question.id]
                                    : ""
                                }
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleScoreChange(
                                    team.id,
                                    question.id,
                                    e.target.value
                                      ? String(e.target.value)
                                      : undefined
                                  )
                                }
                                sx={{
                                  flex: 2,
                                  "& .MuiInputBase-input": {
                                    fontSize: "0.75rem",
                                    padding: "6px",
                                  },
                                }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </Box>
          ) : (
            /* ===== DESKTOP/TABLET LAYOUT (wide table) ===== */
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
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
                  "& .MuiTableCell-root": {
                    fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                    py: { xs: 0.75, sm: 1.25 },
                    px: { xs: 0.5, sm: 1 },
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        width: { xs: "40px", sm: "50px" },
                        minWidth: { xs: "40px", sm: "50px" },
                      }}
                    ></TableCell>
                    <TableCell
                      sx={{
                        width: { xs: "30%", sm: "35%" },
                        minWidth: { xs: "200px", sm: "250px" },
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                          fontWeight: 600,
                        }}
                      >
                        Criteria
                      </Typography>
                    </TableCell>
                    {filteredTeams.map((team) => (
                      <TableCell
                        key={team.id}
                        align="center"
                        sx={{
                          minWidth: { xs: "80px", sm: "100px" },
                          maxWidth: { xs: "120px", sm: "150px" },
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={team.name}
                        >
                          {team.name}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {questions.map((question) => (
                    <React.Fragment key={question.id}>
                      <TableRow
                        onClick={() => handleToggle(question.id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <IconButton
                            aria-label="expand row"
                            size="small"
                          >
                            {openRows[question.id] ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>

                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            pl: { xs: 1, sm: 2 },
                            textAlign: "left",
                            pr: { xs: 1, sm: 2 },
                            fontWeight: "bold",
                            fontSize: {
                              xs: "0.75rem",
                              sm: "0.9375rem",
                            },
                            minWidth: { xs: "200px", sm: "250px" },
                            cursor: "pointer",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: {
                                xs: "0.75rem",
                                sm: "0.9375rem",
                              },
                              fontWeight: 600,
                              lineHeight: 1.3,
                              cursor: "pointer",
                            }}
                          >
                            {question.questionText}
                          </Typography>
                        </TableCell>

                        {filteredTeams.map((team) => (
                          <TableCell key={team.id} align="center">
                            {question.id !== 9 ? (
                              <>
                                <ScoreInput
                                  size="small"
                                  slotProps={{
                                    htmlInput: {
                                      "aria-label": `${team.name}: ${question.questionText}`,
                                    },
                                  }}
                                  value={formData[team.id]?.[question.id]}
                                  low={question.lowPoints}
                                  high={question.highPoints}
                                  onClick={(e) => e.stopPropagation()}
                                  onScoreChange={(value) =>
                                    handleScoreChange(team.id, question.id, value)
                                  }
                                  onErrorChange={(hasError) =>
                                    setFieldError(`${team.id}-${question.id}`, hasError)
                                  }
                                  sx={{
                                    "& .MuiFormHelperText-root": {
                                      mx: 0,
                                      fontSize: "0.65rem",
                                      lineHeight: 1.2,
                                    },
                                    width: { xs: "60px", sm: "75px" },
                                    "& .MuiInputBase-input": {
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                      padding: {
                                        xs: "6px",
                                        sm: "8px",
                                      },
                                    },
                                  }}
                                />

                                {formData[team.id] && (
                                  <Box
                                    sx={{
                                      display: "inline",
                                      ml: 1,
                                    }}
                                  >
                                    {formData[team.id][question.id] ===
                                      undefined ||
                                    formData[team.id][question.id] === "" ||
                                    formData[team.id][question.id] === 0 ||
                                    formData[team.id][question.id] ===
                                      null ? (
                                      <CloseIcon
                                        fontSize="small"
                                        sx={{ color: "red" }}
                                      />
                                    ) : (
                                      <CheckIcon
                                        fontSize="small"
                                        sx={{ color: "green" }}
                                      />
                                    )}
                                  </Box>
                                )}
                              </>
                            ) : (
                              <TextField
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                                multiline
                                placeholder="Comments"
                                value={
                                  formData[team.id] &&
                                  formData[team.id][question.id] !== undefined
                                    ? formData[team.id][question.id]
                                    : ""
                                }
                                onChange={(e) =>
                                  handleScoreChange(
                                    team.id,
                                    question.id,
                                    e.target.value
                                      ? String(e.target.value)
                                      : undefined
                                  )
                                }
                                sx={{
                                  width: { xs: "85%", sm: "90%" },
                                  "& .MuiInputBase-input": {
                                    fontSize: {
                                      xs: "0.75rem",
                                      sm: "0.9375rem",
                                    },
                                    padding: {
                                      xs: "6px",
                                      sm: "8px",
                                    },
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={filteredTeams.length + 2}
                        >
                          <Collapse
                            in={openRows[question.id]}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box
                              sx={{
                                margin: { xs: 1, sm: 2 },
                                p: { xs: 1, sm: 1.5 },
                              }}
                            >
                              <Typography
                                variant="h6"
                                gutterBottom
                                sx={{
                                  fontSize: {
                                    xs: "0.8125rem",
                                    sm: "1rem",
                                  },
                                  fontWeight: 600,
                                  mb: { xs: 1, sm: 1.5 },
                                }}
                              >
                                {question.questionText} - Scoring Criteria
                              </Typography>

                              {renderCriteriaBlock(question)}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Submit button */}
          <Button
            variant="contained"
            onClick={() => setOpenAreYouSure(true)}
            disabled={!allFieldsFilled || hasFieldErrors || isSubmitting}
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
          >
            {isSubmitting ? "Submitting…" : "Submit All"}
          </Button>

          <AreYouSureModal
            open={openAreYouSure}
            handleClose={() => setOpenAreYouSure(false)}
            title="Are you sure you want to submit scores for all teams?"
            handleSubmit={handleSubmit}
          />
        </Container>
      </Box>
    </>
  );
}
