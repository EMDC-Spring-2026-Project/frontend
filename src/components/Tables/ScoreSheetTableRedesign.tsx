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
import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import AreYouSureModal from "../Modals/AreYouSureModal";
import toast from "react-hot-toast";
import ScoreInput from "../ScoreInput";
import { useScoreSheetLoader } from "../../utils/useScoreSheetLoader";
import BulkScoreLoadError from "./BulkScoreLoadError";
import { useFieldErrors } from "../../utils/useFieldErrors";

type IScoreSheetTableProps = {
  sheetType: number;
  title: string;
  teamName: string;
  questions: any[];
  teamId: number | null;
  judgeId: number | null;
};

export default function ScoreSheetTableRedesign({
  sheetType,
  title,
  teamName,
  questions,
  teamId,
  judgeId,
}: IScoreSheetTableProps) {
  const [openRows, setOpenRows] = React.useState<{ [key: number]: boolean }>(
    {}
  );
  const { scoreSheet, updateScores, submitScoreSheet, clearScoreSheet } =
    useScoreSheetStore();
  const { loadStatus, reload } = useScoreSheetLoader(judgeId, teamId, sheetType);
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const { hasFieldErrors, setFieldError } = useFieldErrors();

  const navigate = useNavigate();

  const handleToggle = (id: number) => {
    setOpenRows((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };


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
        8: scoreSheet.field9,
      });
    } else {
      setFormData({});
    }
  }, [scoreSheet]); // Removed judgeId, teamId as they're not needed for form data updates

  useEffect(() => {
    const handlePageHide = () => {
      clearScoreSheet();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      clearScoreSheet();
    };
  }, [clearScoreSheet]);

  const handleScoreChange = (
    questionId: number,
    value: number | string | undefined
  ) => {
    setFormData((prevState) => ({
      ...prevState,
      [questionId]: value,
    }));
  };

  const handleSaveScoreSheet = () => {
    if (hasFieldErrors) {
      toast.error("Fix the scores marked in red before saving.");
      return;
    }
    if (!scoreSheet) {
      toast.error("This scoresheet isn't loaded, so nothing was saved.");
      return;
    }
    updateScores({
      id: scoreSheet.id,
      field1: formData[1],
      field2: formData[2],
      field3: formData[3],
      field4: formData[4],
      field5: formData[5],
      field6: formData[6],
      field7: formData[7],
      field8: formData[8]?.toString(),
    });
  };

  const allFieldsFilled = () => {
    const allFilled = Object.keys(formData).every((key) => {
      const fieldId = Number(key);
      if (fieldId === 8) {
        return true;
      }

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
      acc[question.id] = false; // Collapse each row
      return acc;
    }, {} as { [key: number]: boolean });
    setOpenRows(updatedOpenRows);
  };

  const handleSubmit = async () => {
    if (!scoreSheet) {
      toast.error("This scoresheet isn't loaded, so nothing was submitted.");
      setOpenAreYouSure(false);
      return;
    }
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
        field9: formData[8]?.toString(),
      });
      setOpenAreYouSure(false);
      
      // Small delay to ensure toast is visible before navigation
      setTimeout(() => {
        navigate(-1);
      }, 100);
    } catch (error) {
      console.error('Error submitting redesign scoresheet:', error);
      toast.error("Failed to submit redesign scoresheet. Please try again.");
      setOpenAreYouSure(false);
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

  return loadStatus === "loading" ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  ) : (
    <>
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

      {/* Page title + team name (subtitle) */}
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%"
      }}>
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
      </Box>
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Actions: save, expand incomplete, collapse all */}
        <Box sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: { xs: 1, sm: 1.5 },
          mb: 2,
          width: "100%"
        }}>
          <Button
            variant="contained"
            onClick={handleSaveScoreSheet}
            sx={{
              bgcolor: theme.palette.success.main,
              "&:hover": { bgcolor: theme.palette.success.dark },
              color: "#fff",
              minWidth: { xs: 120, sm: 160, md: 200 }, // responsive widths
              height: { xs: 36, sm: 40, md: 44 },      // responsive heights
              fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.9rem" },
              textTransform: "none",
              borderRadius: 2,
              mb: { xs: 1, sm: 0 }, // margin bottom only on small screens
              p: { xs: "4px 8px", sm: "6px 12px" } // responsive padding
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
              minWidth: { xs: 120, sm: 160, md: 200 }, // responsive widths
              height: { xs: 36, sm: 40, md: 44 },      // responsive heights
              fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.9rem" },
              textTransform: "none",
              borderRadius: 2,
              mb: { xs: 1, sm: 0 }, // margin bottom only on small screens
              p: { xs: "4px 8px", sm: "6px 12px" } // responsive padding
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
              "&:hover": { borderColor: theme.palette.grey[600], bgcolor: theme.palette.grey[50] },
              minWidth: { xs: 120, sm: 160, md: 200 }, // responsive widths
              height: { xs: 36, sm: 40, md: 44 },      // responsive heights
              fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.9rem" },
              textTransform: "none",
              borderRadius: 2,
              mb: { xs: 1, sm: 0 }, // margin bottom only on small screens
              p: { xs: "4px 8px", sm: "6px 12px" } // responsive padding
            }}
          >
            Collapse All
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Scoring table: each question row can be expanded to show criteria + input */}
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
              "& .MuiTableRow-root": { transition: "background-color 120ms ease" },
              "& td, & th": { borderColor: theme.palette.grey[200] },
            }}
          >
            <TableBody>
              {questions.map((question) => (
                <React.Fragment key={question.id}>
                  {/* Summary row: shows question text and status icon */}
                  <TableRow onClick={() => handleToggle(question.id)} sx={{ cursor: "pointer" }}>
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
                        pl: 2, 
                        textAlign: "left", 
                        pr: 2, 
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {question.questionText}
                    </TableCell>
                    <TableCell align="right" scope="row" sx={{ width: 56, fontSize: 1 }}>
                      {/* For questions 1..7 show a check/close icon; question 8 is comments */}
                      {question.id != 8 &&
                        (formData[question.id] === undefined || formData[question.id] === 0 || formData[question.id] === "" || formData[question.id] === null ? (
                          <CloseIcon sx={{ color: theme.palette.error.main }} />
                        ) : (
                          <CheckIcon sx={{ color: theme.palette.success.main }} />
                        ))}
                    </TableCell>
                  </TableRow>
                  {/* Details row: criteria cards + score input (or comments for Q8) */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                      <Collapse in={openRows[question.id]} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            mt: { xs: 0.5, sm: 1 },
                            mb: { xs: 0.5, sm: 1 },
                            display: "flex",
                            gap: { xs: 1, sm: 2 },
                            flexDirection: { md: "row", sm: "column", xs: "column" },
                            width: { xs: "100%", sm: "80%" },
                            alignItems: "stretch",
                            justifyContent: "center",
                            px: { xs: 0.5, sm: 2 },
                          }}
                        >
                          {question.id !== 8 ? (
                            <>
                              {/* Criteria 1 card */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 0.75, sm: 1 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                <Typography sx={{fontSize: { xs: "0.65rem", sm: "0.85rem" }}}>{question.criteria1}</Typography>
                                <Typography sx={{ mt: 1, fontWeight: 800, fontSize: { xs: 10, sm: 12 } }}>
                                  {question.criteria1Points}
                                </Typography>
                              </Box>

                              {/* Criteria 2 card */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 0.75, sm: 1.5 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                <Typography sx={{fontSize: { xs: "0.65rem", sm: "0.85rem" }}}>{question.criteria2}</Typography>
                                <Typography sx={{ mt: 1, fontWeight: 800, fontSize: { xs: 10, sm: 12 } }}>
                                  {question.criteria2Points}
                                </Typography>
                              </Box>

                              {/* Criteria 3 card */}
                              <Box
                                sx={{
                                  bgcolor: theme.palette.grey[50],
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  p: { xs: 0.75, sm: 1 },
                                  borderRadius: 2,
                                  flex: 1,
                                }}
                              >
                                <Typography sx={{fontSize: { xs: "0.65rem", sm: "0.85rem" }}}>{question.criteria3}</Typography>
                                <Typography sx={{ mt: 1, fontWeight: 800, fontSize: { xs: 10, sm: 12 } }}>
                                  {question.criteria3Points}
                                </Typography>
                              </Box>
                              {/* Numeric score input for Q1..Q7 */}
                              <Box sx={{ 
                                display: "flex", 
                                alignItems: "flex-start", 
                                justifyContent: "center",
                                minWidth: { xs: "80px", sm: "120px" },
                                maxWidth: { xs: "100px", sm: "140px" },
                                mx: { xs: 0.5, sm: 2 }
                              }}>
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
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 2,
                                    },
                                    "& .MuiFormHelperText-root": {
                                      fontSize: { xs: "0.6rem", sm: "0.75rem" },
                                      mt: 0.5,
                                      mx: 0
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.75rem", sm: "0.875rem" }
                                    },
                                    "& .MuiOutlinedInput-input": {
                                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                      py: { xs: 1, sm: 1.5 }
                                    }
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
                                  e.target.value ? String(e.target.value) : undefined
                                )
                              }
                              sx={{ 
                                width: "90%",
                                "& .MuiInputLabel-root": {
                                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                                },
                                "& .MuiOutlinedInput-input": {
                                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                                }
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
          variant="contained"
          onClick={() => setOpenAreYouSure(true)}
          disabled={!allFieldsFilled() || hasFieldErrors}
          sx={{
            mt: 3,
            bgcolor: theme.palette.success.main,
            "&:hover": { bgcolor: theme.palette.success.dark },
            color: "#fff",
            minWidth: 200,
            height: 44,
            textTransform: "none",
            borderRadius: 2,
          }}
        >
          Submit
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