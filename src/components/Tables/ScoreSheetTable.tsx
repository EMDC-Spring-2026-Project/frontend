import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Box,
  Collapse,
  IconButton,
  Container,
  Typography,
  TextField,
  Button,
  Divider,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import theme from "../../theme";
import { useNavigate } from "react-router-dom";
import { useScoreSheetStore } from "../../store/primary_stores/scoreSheetStore";
import { useEffect, useState, useCallback } from "react";
import { useScoreSheetLoader } from "../../utils/useScoreSheetLoader";
import BulkScoreLoadError from "./BulkScoreLoadError";
import { useScoreDraft } from "../../utils/useScoreDraft";
import DraftRestoredNotice from "../DraftRestoredNotice";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import AreYouSureModal from "../Modals/AreYouSureModal";
import ScoreInput from "../ScoreInput";
import { useFieldErrors } from "../../utils/useFieldErrors";
import toast from "react-hot-toast";

type IScoreSheetTableProps = {
  sheetType: number;
  title: string;
  teamName: string;
  questions: any[];
  seperateJrAndSr: boolean;
  teamId: number | null;
  judgeId: number | null;
};

export default function ScoreSheetTable({
  sheetType,
  title,
  teamName,
  questions,
  teamId,
  judgeId,
  seperateJrAndSr,
}: IScoreSheetTableProps) {
  const [openRows, setOpenRows] = React.useState<{ [key: number]: boolean }>({});
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hasFieldErrors, setFieldError } = useFieldErrors();

  const { scoreSheet, updateScores, submitScoreSheet } = useScoreSheetStore();
  const { loadStatus, reload } = useScoreSheetLoader(judgeId, teamId, sheetType);

  const navigate = useNavigate();

  const handleToggle = useCallback((id: number) => {
    setOpenRows((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  }, []);

  const [formData, setFormData] = useState<{
    [key: number]: number | string | undefined;
  }>({
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
    7: undefined,
    8: undefined,
    9: undefined,
  });

  useEffect(() => {
    if (scoreSheet) {
      setFormData({
        1: scoreSheet.field1,
        2: scoreSheet.field2,
        3: scoreSheet.field3,
        4: scoreSheet.field4,
        5: scoreSheet.field5,
        6: scoreSheet.field6,
        7: scoreSheet.field7,
        8: scoreSheet.field8,
        9: scoreSheet.field9,
      });
    } else {
      setFormData({});
    }
  }, [scoreSheet]);

  // Keep typed-but-unsaved scores across a refresh (#11)
  const { restored, markSaved, discardDraft } = useScoreDraft({
    draftKey: judgeId && teamId ? `${judgeId}:${teamId}:${sheetType}` : null,
    ready: loadStatus === "ready" && !!scoreSheet,
    values: formData,
    setValues: setFormData,
  });

  const handleScoreChange = useCallback(
    (questionId: number, value: number | string | undefined) => {
      setFormData((prevState) => ({
        ...prevState,
        [questionId]: value,
      }));
    },
    []
  );


  const handleSaveScoreSheet = useCallback(async () => {
    if (!scoreSheet) {
      toast.error("This scoresheet isn't loaded, so nothing was saved.");
      return;
    }
    if (hasFieldErrors) {
      toast.error("Fix the scores marked in red before saving.");
      return;
    }

    const scoreData = {
      id: scoreSheet.id,
      field1: formData[1] !== undefined ? formData[1] : undefined,
      field2: formData[2] !== undefined ? formData[2] : undefined,
      field3: formData[3] !== undefined ? formData[3] : undefined,
      field4: formData[4] !== undefined ? formData[4] : undefined,
      field5: formData[5] !== undefined ? formData[5] : undefined,
      field6: formData[6] !== undefined ? formData[6] : undefined,
      field7: formData[7] !== undefined ? formData[7] : undefined,
      field8: formData[8] !== undefined ? formData[8] : undefined,
      field9:
        formData[9] !== undefined ? formData[9]?.toString() : undefined,
    };

    try {
      await updateScores(scoreData);
      markSaved();
   
      // no navigation, no reload
    } catch (err) {
      console.error("Error saving scoresheet:", err);

    }
  }, [scoreSheet, formData, updateScores, hasFieldErrors, markSaved]);

  const allFieldsFilled = () => {
    const allFilled = Object.keys(formData).every((key) => {
      const fieldId = Number(key);
      if (fieldId === 9) return true;
      const isFilled =
        formData[fieldId] !== undefined &&
        formData[fieldId] !== 0 &&
        formData[fieldId] !== "";
      return isFilled;
    });
    return allFilled;
  };

  const getIncompleteRows = () => {
    return questions
      .filter(
        (question) =>
          formData[question.id] === undefined ||
          formData[question.id] === "" ||
          formData[question.id] === 0
      )
      .map((question) => question.id);
  };

  const expandIncompleteRows = () => {
    const incompleteRows = getIncompleteRows();
    const updatedOpenRows = incompleteRows.reduce(
      (acc, id) => ({
        ...acc,
        [id]: true,
      }),
      {}
    );
    setOpenRows(updatedOpenRows);
  };

  const handleCollapseAllRows = () => {
    const updatedOpenRows = questions.reduce((acc, question) => {
      acc[question.id] = false;
      return acc;
    }, {} as { [key: number]: boolean });
    setOpenRows(updatedOpenRows);
  };

  const handleSubmit = async () => {
  if (isSubmitting) return;
  if (!scoreSheet) {
    toast.error("This scoresheet isn't loaded, so nothing was submitted.");
    setOpenAreYouSure(false);
    return;
  }
  setIsSubmitting(true);
  try {
    await submitScoreSheet({
      id: scoreSheet.id,
      isSubmitted: true,
      sheetType: sheetType,
      field1: formData[1],
      field2: formData[2],
      field3: formData[3],
      field4: formData[4],
      field5: formData[5],
      field6: formData[6],
      field7: formData[7],
      field8: formData[8],
      field9: formData[9]?.toString(),
    });
    markSaved();
    setOpenAreYouSure(false);
    setTimeout(() => {
      navigate(-1);
    }, 100);
  } catch (error) {
    console.error("Error submitting scoresheet:", error);
    setOpenAreYouSure(false);
  } finally {
    setIsSubmitting(false);
  }
};

  if (loadStatus === "error") {
    return (
      <BulkScoreLoadError
        message="This scoresheet could not be loaded, so nothing can be entered or saved yet. Check the connection and try again."
        onRetry={reload}
      />
    );
  }

  if (loadStatus === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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

      <Typography
        variant="h4"
        sx={{
          mt: 3,
          mb: 0.5,
          fontWeight: 800,
          color: theme.palette.success.main,
          textAlign: "center",
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 2, textAlign: "center" }}
      >
        {teamName}
      </Typography>

      <Container
        component="form"
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "720px", md: "900px" },
          mx: "auto",
          p: { xs: 2, sm: 3 },
          bgcolor: "#fff",
          borderRadius: 3,
          border: `1px solid ${theme.palette.grey[300]}`,
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: { xs: 1, sm: 1.5 },
            mb: 2,
          }}
        >
          <Button
            type="button"
            variant="contained"
            onClick={handleSaveScoreSheet}
            sx={{
              bgcolor: theme.palette.success.main,
              "&:hover": { bgcolor: theme.palette.success.dark },
              color: "#fff",
              minWidth: { xs: 150, sm: 200 },
              height: { xs: 36, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            onClick={expandIncompleteRows}
            sx={{
              borderColor: theme.palette.success.main,
              color: theme.palette.success.main,
              "&:hover": {
                borderColor: theme.palette.success.dark,
                bgcolor: "rgba(46,125,50,0.06)",
              },
              minWidth: { xs: 150, sm: 200 },
              height: { xs: 36, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            Expand Incomplete Rows
          </Button>
          <Button
            variant="outlined"
            onClick={handleCollapseAllRows}
            sx={{
              borderColor: theme.palette.grey[400],
              color: theme.palette.text.primary,
              "&:hover": {
                borderColor: theme.palette.grey[600],
                bgcolor: theme.palette.grey[50],
              },
              minWidth: { xs: 150, sm: 200 },
              height: { xs: 36, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.75rem", sm: "0.9375rem" },
            }}
          >
            Collapse All
          </Button>
        </Box>

        {restored && <DraftRestoredNotice onDiscard={discardDraft} />}

        <Divider sx={{ mb: 2 }} />

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[200]}`,
            overflow: "hidden",
          }}
        >
          <Table
            sx={{
              "& .MuiTableRow-root": {
                transition: "background-color 120ms ease",
              },
              "& td, & th": { borderColor: theme.palette.grey[200] },
            }}
          >
            <TableBody>
              {questions.map((question) => (
                <React.Fragment key={question.id}>
                  <TableRow
                    onClick={() => handleToggle(question.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell sx={{ width: 56 }}>
                      <IconButton aria-label="expand row" size="small">
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
                        fontWeight: 600,
                        fontSize: { xs: "0.75rem", sm: "0.9375rem" },
                        cursor: "pointer",
                      }}
                    >
                      {question.questionText}
                    </TableCell>
                    <TableCell align="right" scope="row" sx={{ width: 56 }}>
                      {question.id != 9 &&
                        (formData[question.id] === undefined ||
                        formData[question.id] === 0 ||
                        formData[question.id] === "" ||
                        formData[question.id] === null ? (
                          <CloseIcon sx={{ color: theme.palette.error.main }} />
                        ) : (
                          <CheckIcon
                            sx={{ color: theme.palette.success.main }}
                          />
                        ))}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={6}
                    >
                      <Collapse
                        in={openRows[question.id]}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box
                          sx={{
                            mt: { xs: 1, sm: 2 },
                            mb: { xs: 1, sm: 2 },
                            display: "flex",
                            gap: { xs: 1, sm: 2 },
                            flexDirection: {
                              md: "row",
                              sm: "column",
                              xs: "column",
                            },
                            width: "100%",
                            alignItems: "stretch",
                            justifyContent: "center",
                            px: { xs: 0.5, sm: 2 },
                          }}
                        >
                          {question.id !== 9 ? (
                            <>
                              {/* Criteria 1 */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 1, sm: 1.5 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                {seperateJrAndSr && question.id == 4 ? (
                                  <>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        mb: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Jr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria1Junior}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        my: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Sr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria1Senior}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                    }}
                                  >
                                    {question.criteria1}
                                  </Typography>
                                )}
                                <Typography
                                  sx={{
                                    mt: { xs: 0.5, sm: 1 },
                                    fontWeight: 600,
                                    fontSize: {
                                      xs: "0.75rem",
                                      sm: "0.9375rem",
                                    },
                                  }}
                                >
                                  {question.criteria1Points}
                                </Typography>
                              </Box>

                              {/* Criteria 2 */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 1, sm: 1.5 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                {seperateJrAndSr && question.id == 4 ? (
                                  <>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        mb: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Jr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria2Junior}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        my: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Sr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria2Senior}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                    }}
                                  >
                                    {question.criteria2}
                                  </Typography>
                                )}
                                <Typography
                                  sx={{
                                    mt: { xs: 0.5, sm: 1 },
                                    fontWeight: 600,
                                    fontSize: {
                                      xs: "0.75rem",
                                      sm: "0.9375rem",
                                    },
                                  }}
                                >
                                  {question.criteria2Points}
                                </Typography>
                              </Box>

                              {/* Criteria 3 */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 1, sm: 1.5 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                {seperateJrAndSr && question.id == 4 ? (
                                  <>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        mb: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Jr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria3Junior}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                        fontWeight: 600,
                                        my: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      Sr. Div.
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.9375rem",
                                        },
                                      }}
                                    >
                                      {question.criteria3Senior}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                    }}
                                  >
                                    {question.criteria3}
                                  </Typography>
                                )}
                                <Typography
                                  sx={{
                                    mt: { xs: 0.5, sm: 1 },
                                    fontWeight: 600,
                                    fontSize: {
                                      xs: "0.75rem",
                                      sm: "0.9375rem",
                                    },
                                  }}
                                >
                                  {question.criteria3Points}
                                </Typography>
                              </Box>

                              {/* Numeric score input */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "center",
                                  minWidth: { xs: "80px", sm: "120px" },
                                  maxWidth: { xs: "100px", sm: "140px" },
                                  mx: { xs: 0.5, sm: 2 },
                                }}
                              >
                                <ScoreInput
                                  id={`score-${question.id}`}
                                  label="Score"
                                  value={formData[question.id]}
                                  low={question.lowPoints}
                                  high={question.highPoints}
                                  onScoreChange={(value) =>
                                    handleScoreChange(question.id, value)
                                  }
                                  onErrorChange={(hasError) =>
                                    setFieldError(question.id, hasError)
                                  }
                                  hint={`Allowed: ${question.lowPoints} – ${question.highPoints}`}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                  sx={{
                                    width: "100%",
                                    "& .MuiOutlinedInput-root.Mui-focused fieldset":
                                      {
                                        borderColor: theme.palette.success.main,
                                      },
                                    "& label.Mui-focused": {
                                      color: theme.palette.success.main,
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 2,
                                    },
                                    "& .MuiFormHelperText-root": {
                                      fontSize: {
                                        xs: "0.6rem",
                                        sm: "0.75rem",
                                      },
                                      mt: 0.5,
                                      mx: 0,
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                    },
                                    "& .MuiOutlinedInput-input": {
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.9375rem",
                                      },
                                      py: { xs: 1, sm: 1.5 },
                                    },
                                  }}
                                />
                              </Box>
                            </>
                          ) : (
                            <TextField
                              id="outlined-multiline-flexible"
                              label="Enter Comments"
                              multiline
                              maxRows={4}
                              value={
                                formData[question.id] !== undefined
                                  ? formData[question.id]
                                  : ""
                              }
                              onChange={(e) =>
                                handleScoreChange(
                                  question.id,
                                  e.target.value
                                    ? String(e.target.value)
                                    : undefined
                                )
                              }
                              sx={{
                                width: "90%",
                                "& .MuiOutlinedInput-root.Mui-focused fieldset":
                                  {
                                    borderColor: theme.palette.success.main,
                                  },
                                "& label.Mui-focused": {
                                  color: theme.palette.success.main,
                                },
                                "& .MuiInputLabel-root": {
                                  fontSize: {
                                    xs: "0.75rem",
                                    sm: "0.9375rem",
                                  },
                                },
                                "& .MuiOutlinedInput-input": {
                                  fontSize: {
                                    xs: "0.75rem",
                                    sm: "0.9375rem",
                                  },
                                },
                              }}
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
        </TableContainer>

        <Button
          type="button"
          variant="contained"
          onClick={() => setOpenAreYouSure(true)}
          disabled={!allFieldsFilled() || hasFieldErrors || isSubmitting}
          sx={{
            mt: 3,
            bgcolor: theme.palette.success.main,
            "&:hover": { bgcolor: theme.palette.success.dark },
            color: "#fff",
            minWidth: { xs: 150, sm: 200 },
            height: { xs: 36, sm: 44 },
            textTransform: "none",
            borderRadius: 2,
            fontSize: { xs: "0.75rem", sm: "0.9375rem" },
          }}
        >
        {isSubmitting ? "Submitting…" : "Submit"}
        </Button>

        <AreYouSureModal
          open={openAreYouSure}
          handleClose={() => setOpenAreYouSure(false)}
          title="Are you sure you want to submit?"
          handleSubmit={handleSubmit}
        />
      </Container>
    </>
  );
}
