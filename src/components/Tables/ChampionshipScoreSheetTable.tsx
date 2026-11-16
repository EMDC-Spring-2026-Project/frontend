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
import ScoreInput from "../ScoreInput";
import { useScoreSheetLoader } from "../../utils/useScoreSheetLoader";
import BulkScoreLoadError from "./BulkScoreLoadError";
import { useFieldErrors } from "../../utils/useFieldErrors";
import PenaltyCategory from "../PenaltyCategory";
import { machineDesignQuestions } from "../../data/machineDesignQuestions";
import { presentationQuestions } from "../../data/presentationQuestions";
import { generalPenaltiesQuestions } from "../../data/generalPenaltiesQuestions";
import { runPenaltiesQuestions } from "../../data/runPenaltiesQuestions";
import toast from "react-hot-toast";

/**
 * Props that control which sheet to load and how to render it
 */
type IChampionshipScoreSheetTableProps = {
  sheetType: number;            // which sheet (e.g., championship = 7)
  title: string;                // page title
  teamName: string;             // for the subtitle
  teamId: number | null;        // which team is being scored
  judgeId: number | null;       // which judge is scoring
  seperateJrAndSr: boolean;     // whether to show separate Jr/Sr criteria text
};

export default function ChampionshipScoreSheetTable({
  sheetType,
  title,
  teamName,
  teamId,
  judgeId,
  seperateJrAndSr,
}: IChampionshipScoreSheetTableProps) {
  // Track which sections are expanded
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    "Machine Design": false,
    "Presentation": false,
    "Run Penalties": false,
    "General Penalties": false,
  });

  // Track which individual questions are expanded
  const [openQuestions, setOpenQuestions] = React.useState<{ [key: number]: boolean }>({});

  // Store hooks for retrieving the score sheet mapping and data
  const { scoreSheet, updateScores, submitScoreSheet } = useScoreSheetStore();
  const { loadStatus, reload } = useScoreSheetLoader(judgeId, teamId, sheetType);

  // Confirm-submit modal
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const { hasFieldErrors, setFieldError } = useFieldErrors();

  // Form data state for scoring questions
  const [formData, setFormData] = useState<{ [key: number]: number | string | undefined }>({
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
    7: undefined,
    8: undefined,
    9: undefined,
    10: undefined,
    11: undefined,
    12: undefined,
    13: undefined,
    14: undefined,
    15: undefined,
    16: undefined,
    17: undefined,
    18: undefined,
  });
  
  // Penalty state for penalty questions - using string keys for prefixed IDs
  const [penaltyState, setPenaltyState] = useState<{ [key: string]: number | string }>({});

  const navigate = useNavigate();

  /**
   * Toggle a section open/closed
   */
  const handleToggleSection = (section: string) => {
    setOpenSections((prevState) => ({
      ...prevState,
      [section]: !prevState[section],
    }));
  };

  /**
   * Toggle a question row open/closed
   */
  const handleToggleQuestion = (id: number) => {
    setOpenQuestions((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };


  /**
   * When scoreSheet data arrives:
   * populate formData with existing values from the database
   */
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
        10: scoreSheet.field10,
        11: scoreSheet.field11,
        12: scoreSheet.field12,
        13: scoreSheet.field13,
        14: scoreSheet.field14,
        15: scoreSheet.field15,
        16: scoreSheet.field16,
        17: scoreSheet.field17,
        18: scoreSheet.field18,
      });
    } else {
      setFormData({});
    }
  }, [scoreSheet]);

  /**
   * Initialize penalty state from scoresheet data
   */
  useEffect(() => {
    if (scoreSheet) {
      const initialPenaltyState: { [key: string]: number } = {};
      
      // Initialize general penalties (fields 19-25)
      generalPenaltiesQuestions.forEach((penalty, index) => {
        const fieldNumber = 19 + index;
        const fieldValue = Number(getattr(scoreSheet, `field${fieldNumber}`, 0)) || 0;
        // Convert penalty points back to penalty state
        // For checkboxes: penalty points / point value = 0 or 1
        // For increments: penalty points / point value = count
        const pointValue = Number(penalty.pointValue) || 0;
        const penaltyStateValue = pointValue !== 0 ? fieldValue / pointValue : 0;
        initialPenaltyState[`general_${penalty.id}`] = penaltyStateValue;
      });
      
      // Initialize run penalties (fields 26-42) - skip field9 (id 9) as it's empty
      let runPenaltyFieldIndex = 0;
      runPenaltiesQuestions.forEach((penalty) => {
        // Skip the empty field9 (id 9) in run penalties
        if (penalty.id === 9) return;
        
        const fieldNumber = 26 + runPenaltyFieldIndex;
        const fieldValue = Number(getattr(scoreSheet, `field${fieldNumber}`, 0)) || 0;
        const pointValue = Number(penalty.pointValue) || 0;
        const penaltyStateValue = pointValue !== 0 ? fieldValue / pointValue : 0;
        initialPenaltyState[`run_${penalty.id}`] = penaltyStateValue;
        runPenaltyFieldIndex++;
      });
      
      setPenaltyState(initialPenaltyState);
    } else {
      setPenaltyState({});
    }
  }, [scoreSheet]);

  // Helper function to safely get field values
  const getattr = (obj: any, field: string, defaultValue: any) => {
    return obj && obj[field] !== undefined ? obj[field] : defaultValue;
  };

  /**
   * Handle score changes for regular scoring questions with validation
   */
  const handleScoreChange = (
    questionId: number,
    value: number | string | undefined,
    question?: any
  ) => {
    // For scoring questions (not comments), validate the range
    if (question && question.lowPoints !== undefined && question.highPoints !== undefined) {
      if (value !== undefined && value !== "") {
        const numValue = Number(value);
        if (numValue < question.lowPoints || numValue > question.highPoints) {
          // Invalid range - don't update
          return;
        }
      }
    }
    
    setFormData((prevState) => ({
      ...prevState,
      [questionId]: value,
    }));
  };

  // Penalty handlers - need to determine which penalty type based on context
  const handleCheckboxChange = (field: number, penaltyType?: string) => {
    const key = penaltyType === 'general' ? `general_${field}` : 
                penaltyType === 'run' ? `run_${field}` : 
                field; // fallback for backward compatibility
    
    setPenaltyState((prevState) => ({
      ...prevState,
      [key]: (prevState[key] || 0) === 1 ? 0 : 1,
    }));
  };

  const handleIncrement = (field: number, upperBound: number, penaltyType?: string) => {
    const key = penaltyType === 'general' ? `general_${field}` : 
                penaltyType === 'run' ? `run_${field}` : 
                field; // fallback for backward compatibility
    
    setPenaltyState((prevState: any) => ({
      ...prevState,
      [key]: Math.min((prevState[key] || 0) + 1, upperBound),
    }));
  };

  const handleDecrement = (field: number, lowerBound: number, penaltyType?: string) => {
    const key = penaltyType === 'general' ? `general_${field}` : 
                penaltyType === 'run' ? `run_${field}` : 
                field; // fallback for backward compatibility
    
    setPenaltyState((prevState: any) => ({
      ...prevState,
      [key]: Math.max((prevState[key] || 0) - 1, lowerBound),
    }));
  };

  /**
   * Save the score sheet (draft)
   */
  const handleSaveScoreSheet = () => {
    if (hasFieldErrors) {
      toast.error("Fix the scores marked in red before saving.");
      return;
    }
    if (!scoreSheet) {
      toast.error("This scoresheet isn't loaded, so nothing was saved.");
      return;
    }
    const allFields: { [key: string]: number | string } = {};
    
    // Add all form data fields (Machine Design, Presentation, Comments)
    Object.keys(formData).forEach((key) => {
      const questionId = Number(key);
      const value = formData[questionId];
      
      // Handle different field types
      if (questionId === 9 || questionId === 18) {
        // Comment fields - convert null/undefined to empty string
        allFields[`field${questionId}`] = value !== undefined && value !== null ? value : "";
      } else {
        // Score fields - convert null/undefined to 0
        allFields[`field${questionId}`] = value !== undefined && value !== null ? value : 0;
      }
    });

    // Add penalty fields (mapped to fields 19+)
    // General Penalties: fields 19-25 (7 questions)
    generalPenaltiesQuestions.forEach((penalty, index) => {
      const fieldNumber = 19 + index;
      const penaltyValue = Number(penaltyState[`general_${penalty.id}`]) || 0;
      const pointValue = Number(penalty.pointValue) || 0;
      const fieldValue = penaltyValue * pointValue;
      allFields[`field${fieldNumber}`] = fieldValue;
    });

    // Run Penalties: fields 26-42 (17 questions, skipping empty id 9)
    let runPenaltyFieldIndex = 0;
    runPenaltiesQuestions.forEach((penalty) => {
      // Skip the empty field9 (id 9) in run penalties
      if (penalty.id === 9) return;
      
      const fieldNumber = 26 + runPenaltyFieldIndex;
      const penaltyValue = Number(penaltyState[`run_${penalty.id}`]) || 0;
      const pointValue = Number(penalty.pointValue) || 0;
      const fieldValue = penaltyValue * pointValue;
      allFields[`field${fieldNumber}`] = fieldValue;
      runPenaltyFieldIndex++;
    });

    updateScores({
      id: scoreSheet.id,
      ...allFields,
    });
  };

  /**
   * Check if Machine Design section is complete (fields 1-8)
   */
  const isMachineDesignComplete = () => {
    const machineDesignQuestions = [1, 2, 3, 4, 5, 6, 7, 8];
    return machineDesignQuestions.every((questionId) => {
      return formData[questionId] !== undefined && 
             formData[questionId] !== 0 && 
             formData[questionId] !== "" &&
             formData[questionId] !== null;
    });
  };

  /**
   * Check if Presentation section is complete (fields 10-17)
   */
  const isPresentationComplete = () => {
    const presentationQuestions = [10, 11, 12, 13, 14, 15, 16, 17];
    return presentationQuestions.every((questionId) => {
      return formData[questionId] !== undefined && 
             formData[questionId] !== 0 && 
             formData[questionId] !== "" &&
             formData[questionId] !== null;
    });
  };

  /**
   * Check if all required fields are filled
   */
  const allFieldsFilled = () => {
    return isMachineDesignComplete() && isPresentationComplete();
  };

  /**
   * Submit the sheet (finalize). Navigates back after success.
   */
  const handleSubmit = async () => {
    if (!scoreSheet) {
      toast.error("This scoresheet isn't loaded, so nothing was submitted.");
      setOpenAreYouSure(false);
      return;
    }
    try {
      const allFields: { [key: string]: number | string } = {};
      
      // Add all form data fields (Machine Design, Presentation, Comments)
      Object.keys(formData).forEach((key) => {
        const questionId = Number(key);
        const value = formData[questionId];
        
        // Handle different field types
        if (questionId === 9 || questionId === 18) {
          // Comment fields - convert null/undefined to empty string
          allFields[`field${questionId}`] = value !== undefined && value !== null ? value : "";
        } else {
          // Score fields - convert null/undefined to 0
          allFields[`field${questionId}`] = value !== undefined && value !== null ? value : 0;
        }
      });

      // Add penalty fields (mapped to fields 19+)
      // General Penalties: fields 19-25 (7 questions)
      generalPenaltiesQuestions.forEach((penalty, index) => {
        const fieldNumber = 19 + index;
        const penaltyValue = Number(penaltyState[`general_${penalty.id}`]) || 0;
        // Convert penalty state to actual penalty points
        // For checkboxes: 1 = apply penalty, 0 = no penalty
        // For increments: count = number of times penalty applies
        const pointValue = Number(penalty.pointValue) || 0;
        const actualPenaltyPoints = penaltyValue * pointValue;
        allFields[`field${fieldNumber}`] = actualPenaltyPoints;
      });

      // Run Penalties: fields 26-42 (17 questions, skipping empty id 9)
      let runPenaltyFieldIndex = 0;
      runPenaltiesQuestions.forEach((penalty) => {
        // Skip the empty field9 (id 9) in run penalties
        if (penalty.id === 9) return;
        
        const fieldNumber = 26 + runPenaltyFieldIndex;
        const penaltyValue = Number(penaltyState[`run_${penalty.id}`]) || 0;
        // Convert penalty state to actual penalty points
        const pointValue = Number(penalty.pointValue) || 0;
        const actualPenaltyPoints = penaltyValue * pointValue;
        allFields[`field${fieldNumber}`] = actualPenaltyPoints;
        runPenaltyFieldIndex++;
      });

      await submitScoreSheet({
        id: scoreSheet.id,
        isSubmitted: true,
        sheetType: sheetType,
        ...allFields,
      });
      
     
      setOpenAreYouSure(false);
      
      // Small delay to ensure toast is visible before navigation
      setTimeout(() => {
        navigate(-1); // back to previous page
      }, 100);
    } catch (error) {
      console.error('Error submitting championship scoresheet:', error);
      toast.error("Failed to submit championship scoresheet. Please try again.");
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

  // Show a spinner while the sheet is loading
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
        width: "100%",
        mt: { xs: 2, sm: 3 },
        mb: 0.5,
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 }
        }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: theme.palette.success.main,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
              textAlign: "center",
            }}
          >
            {title}
          </Typography>
          {/* Completion indicator */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: { xs: 1.5, sm: 2 },
            py: 0.5,
            borderRadius: 2,
            bgcolor: allFieldsFilled() ? theme.palette.success.light : theme.palette.grey[100],
            border: `1px solid ${allFieldsFilled() ? theme.palette.success.main : theme.palette.grey[300]}`,
          }}>
            {allFieldsFilled() ? (
              <CheckIcon sx={{ color: theme.palette.success.main, fontSize: { xs: '16px', sm: '20px' } }} />
            ) : (
              <CloseIcon sx={{ color: theme.palette.error.main, fontSize: { xs: '16px', sm: '20px' } }} />
            )}
            <Typography variant="body2" sx={{ 
              fontWeight: 600,
              color: allFieldsFilled() ? theme.palette.success.main : theme.palette.text.secondary,
              fontSize: { xs: '10px', sm: '12px' }
            }}>
              {allFieldsFilled() ? 'Complete' : 'Incomplete'}
            </Typography>
          </Box>
        </Box>
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            fontSize: { xs: "0.875rem", sm: "0.9rem" },
            textAlign: "center",
          }}
        >
          {teamName}
        </Typography>
      </Box>

      {/* Submitted banner */}
      {scoreSheet?.isSubmitted && (
        <Container maxWidth="lg" sx={{ mb: 2 }}>
          <Box sx={{
            p: 2,
            bgcolor: theme.palette.success.light,
            borderRadius: 2,
            border: `2px solid ${theme.palette.success.main}`,
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ 
              color: theme.palette.success.main,
              fontWeight: 600,
              fontSize: { xs: "0.9rem", sm: "1rem" }
            }}>
              ✓ Scores Successfully Submitted - Form Locked
            </Typography>
          </Box>
        </Container>
      )}

      {/* Main card container for actions + sections */}
      <Container
        component="form"
        maxWidth="lg"
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          bgcolor: "#fff", 
          borderRadius: 3,
          opacity: scoreSheet?.isSubmitted ? 0.7 : 1,
          pointerEvents: scoreSheet?.isSubmitted ? 'none' : 'auto',
          border: `1px solid ${theme.palette.grey[300]}`,
          mb: 3,
        }}
      >
        {/* Actions: save, expand all, collapse all */}
        <Box sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: "wrap", 
          gap: { xs: 1, sm: 1.5 }, 
          mb: 2 
        }}>
          <Button
            variant="contained"
            onClick={handleSaveScoreSheet}
            sx={{
              bgcolor: theme.palette.success.main,
              "&:hover": { bgcolor: theme.palette.success.dark },
              color: "#fff",
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: "auto", sm: 150, md: 200 },
              height: { xs: 40, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.8rem", sm: "0.875rem" }
            }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            onClick={() => setOpenSections({
              "Machine Design": true,
              "Presentation": true,
              "Run Penalties": true,
              "General Penalties": true,
            })}
            sx={{
              borderColor: theme.palette.success.main,
              color: theme.palette.success.main,
              "&:hover": {
                borderColor: theme.palette.success.dark,
                bgcolor: "rgba(46,125,50,0.06)",
              },
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: "auto", sm: 150, md: 200 },
              height: { xs: 40, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.8rem", sm: "0.875rem" }
            }}
          >
            Expand All Sections
          </Button>
          <Button
            variant="outlined"
            onClick={() => setOpenSections({
              "Machine Design": false,
              "Presentation": false,
              "Run Penalties": false,
              "General Penalties": false,
            })}
            sx={{
              borderColor: theme.palette.grey[400],
              color: theme.palette.text.primary,
              "&:hover": { borderColor: theme.palette.grey[600], bgcolor: theme.palette.grey[50] },
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: "auto", sm: 150, md: 200 },
              height: { xs: 40, sm: 44 },
              textTransform: "none",
              borderRadius: 2,
              fontSize: { xs: "0.8rem", sm: "0.875rem" }
            }}
          >
            Collapse All Sections
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Machine Design Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            mb: 2, 
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: 1
          }} onClick={() => handleToggleSection("Machine Design")}>
            {/* Section completion indicator */}
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isMachineDesignComplete() ? theme.palette.success.main : theme.palette.grey[400],
              flexShrink: 0
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: theme.palette.success.main,
              fontSize: { xs: "1rem", sm: "1.25rem" }
            }}>
              Machine Design
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto' }}>
              {openSections["Machine Design"] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={openSections["Machine Design"]}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  "& .MuiTableRow-root": { transition: "background-color 120ms ease" },
                  "& td, & th": { 
                    borderColor: theme.palette.grey[200],
                    fontSize: { xs: "0.75rem", sm: "0.95rem" },
                    py: { xs: 0.5, sm: 1.25 },
                    px: { xs: 0.25, sm: 1 }
                  },
                }}
              >
                <TableBody>
                  {machineDesignQuestions.slice(0, 8).map((question: any, index: number) => (
                    <React.Fragment key={question.id}>
                      <TableRow onClick={() => handleToggleQuestion(index + 1)} sx={{ cursor: "pointer" }}>
                        <TableCell sx={{ width: { xs: 32, sm: 40 } }}>
                          <IconButton aria-label="expand row" size="small">
                            {openQuestions[index + 1] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell 
                          component="th" 
                          scope="row" 
                          sx={{ 
                            fontWeight: 600, 
                            wordBreak: "break-word", 
                            fontSize: { xs: "0.7rem", sm: "0.875rem" },
                            cursor: "pointer"
                          }}
                        >
                          {question.questionText}
                        </TableCell>
                        <TableCell align="right" sx={{ width: { xs: 32, sm: 40 } }}>
                          {formData[index + 1] === undefined || formData[index + 1] === 0 || formData[index + 1] === "" || formData[index + 1] === null ? (
                            <CloseIcon sx={{ color: theme.palette.error.main, fontSize: { xs: "16px", sm: "20px" } }} />
                          ) : (
                            <CheckIcon sx={{ color: theme.palette.success.main, fontSize: { xs: "16px", sm: "20px" } }} />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={openQuestions[index + 1]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2 }}>
                              {/* All questions are scoring questions with criteria */}
                              <Box sx={{ 
                                display: "flex", 
                                gap: { xs: 1, sm: 2 }, 
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { xs: "stretch", md: "flex-start" }
                              }}>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 1: {question.criteria1Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria1Junior : question.criteria1}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 2: {question.criteria2Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria2Junior : question.criteria2}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 3: {question.criteria3Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria3Junior : question.criteria3}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  minWidth: { xs: "100%", sm: 120 },
                                  maxWidth: { xs: "100%", sm: 150 },
                                  mt: { xs: 1, md: 0 }
                                }}>
                                  <ScoreInput
                                    id={`score-${index + 1}`}
                                    label="Score"
                                    value={formData[index + 1]}
                                    disabled={scoreSheet?.isSubmitted}
                                    low={question.lowPoints}
                                    high={question.highPoints}
                                    onScoreChange={(value) =>
                                      handleScoreChange(index + 1, value, question)
                                    }
                                    onErrorChange={(hasError) =>
                                      setFieldError(index + 1, hasError)
                                    }
                                    hint={
                                      <span style={{ fontWeight: 'bold' }}>
                                        {question.lowPoints} - {question.highPoints}
                                      </span>
                                    }
                                    sx={{
                                      width: "100%",
                                      "& .MuiInputBase-input": {
                                        fontSize: { xs: "0.875rem", sm: "1rem" }
                                      }
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              
              {/* Machine Design Comments - Inside the section */}
              <Box sx={{ mt: 2, p: 2, borderTop: `1px solid ${theme.palette.grey[200]}` }}>
                <Box sx={{ 
                  mb: 2, 
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: 1
                }} onClick={() => handleToggleQuestion(17)}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: "0.9rem", sm: "1rem" }
                  }}>
                    Machine Design Comments
                  </Typography>
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    {openQuestions[17] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={openQuestions[17]} timeout="auto" unmountOnExit>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.grey[50],
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.grey[200]}`
                  }}>
                    <TextField
                      label="Enter Machine Design Comments"
                      multiline
                      rows={3}
                      value={formData[9] || ""}
                      disabled={scoreSheet?.isSubmitted}
                      onChange={(e) => handleScoreChange(9, e.target.value || undefined)}
                      sx={{ 
                        width: "100%",
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" }
                        }
                      }}
                      placeholder="Add any additional comments about the machine design..."
                    />
                  </Box>
                </Collapse>
              </Box>
            </TableContainer>
          </Collapse>
        </Box>

        {/* Presentation Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            mb: 2, 
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: 1
          }} onClick={() => handleToggleSection("Presentation")}>
            {/* Section completion indicator */}
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isPresentationComplete() ? theme.palette.success.main : theme.palette.grey[400],
              flexShrink: 0
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: theme.palette.success.main,
              fontSize: { xs: "1rem", sm: "1.25rem" }
            }}>
              Presentation
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto' }}>
              {openSections["Presentation"] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={openSections["Presentation"]}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  "& .MuiTableRow-root": { transition: "background-color 120ms ease" },
                  "& td, & th": { 
                    borderColor: theme.palette.grey[200],
                    fontSize: { xs: "0.75rem", sm: "0.95rem" },
                    py: { xs: 0.5, sm: 1.25 },
                    px: { xs: 0.25, sm: 1 }
                  },
                }}
              >
                <TableBody>
                  {presentationQuestions.slice(0, 8).map((question: any, index: number) => (
                    <React.Fragment key={question.id}>
                      <TableRow onClick={() => handleToggleQuestion(index + 10)} sx={{ cursor: "pointer" }}>
                        <TableCell sx={{ width: { xs: 32, sm: 40 } }}>
                          <IconButton aria-label="expand row" size="small">
                            {openQuestions[index + 10] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell 
                          component="th" 
                          scope="row" 
                          sx={{ 
                            fontWeight: 600, 
                            wordBreak: "break-word", 
                            fontSize: { xs: "0.7rem", sm: "0.875rem" },
                            cursor: "pointer"
                          }}
                        >
                          {question.questionText}
                        </TableCell>
                        <TableCell align="right" sx={{ width: { xs: 32, sm: 40 } }}>
                          {formData[index + 10] === undefined || formData[index + 10] === 0 || formData[index + 10] === "" || formData[index + 10] === null ? (
                            <CloseIcon sx={{ color: theme.palette.error.main, fontSize: { xs: "16px", sm: "20px" } }} />
                          ) : (
                            <CheckIcon sx={{ color: theme.palette.success.main, fontSize: { xs: "16px", sm: "20px" } }} />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={openQuestions[index + 10]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2 }}>
                              {/* Scoring questions with criteria */}
                              <Box sx={{ 
                                display: "flex", 
                                gap: { xs: 1, sm: 2 }, 
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { xs: "stretch", md: "flex-start" }
                              }}>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 1: {question.criteria1Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria1Junior : question.criteria1}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 2: {question.criteria2Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria2Junior : question.criteria2}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  flex: 1,
                                  mb: { xs: 1, md: 0 }
                                }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    fontSize: { xs: "0.7rem", sm: "0.875rem" }
                                  }}>
                                    Criteria 3: {question.criteria3Points}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    mb: 2,
                                    fontSize: { xs: "0.65rem", sm: "0.8rem" },
                                    lineHeight: 1.3
                                  }}>
                                    {seperateJrAndSr && index === 3 ? question.criteria3Junior : question.criteria3}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  minWidth: { xs: "100%", sm: 120 },
                                  maxWidth: { xs: "100%", sm: 150 },
                                  mt: { xs: 1, md: 0 }
                                }}>
                                  <ScoreInput
                                    id={`score-${index + 10}`}
                                    label="Score"
                                    value={formData[index + 10]}
                                    disabled={scoreSheet?.isSubmitted}
                                    low={question.lowPoints}
                                    high={question.highPoints}
                                    onScoreChange={(value) =>
                                      handleScoreChange(index + 10, value, question)
                                    }
                                    onErrorChange={(hasError) =>
                                      setFieldError(index + 10, hasError)
                                    }
                                    hint={
                                      <span style={{ fontWeight: 'bold' }}>
                                        {question.lowPoints} - {question.highPoints}
                                      </span>
                                    }
                                    sx={{
                                      width: "100%",
                                      "& .MuiInputBase-input": {
                                        fontSize: { xs: "0.875rem", sm: "1rem" }
                                      }
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              
              {/* Presentation Comments - Inside the section */}
              <Box sx={{ mt: 2, p: 2, borderTop: `1px solid ${theme.palette.grey[200]}` }}>
                <Box sx={{ 
                  mb: 2, 
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: 1
                }} onClick={() => handleToggleQuestion(18)}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: "0.9rem", sm: "1rem" }
                  }}>
                    Presentation Comments
                  </Typography>
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    {openQuestions[18] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={openQuestions[18]} timeout="auto" unmountOnExit>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.grey[50],
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.grey[200]}`
                  }}>
                    <TextField
                      label="Enter Presentation Comments"
                      multiline
                      rows={3}
                      value={formData[18] || ""}
                      disabled={scoreSheet?.isSubmitted}
                      onChange={(e) => handleScoreChange(18, e.target.value || undefined)}
                      sx={{ 
                        width: "100%",
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" }
                        }
                      }}
                      placeholder="Add any additional comments about the presentation..."
                    />
                  </Box>
                </Collapse>
              </Box>
            </TableContainer>
          </Collapse>
        </Box>

        {/* Run Penalties Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            mb: 2, 
            fontWeight: 600, 
            color: theme.palette.success.main,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: { xs: "1rem", sm: "1.25rem" }
          }} onClick={() => handleToggleSection("Run Penalties")}>
            Run Penalties
            <IconButton size="small" sx={{ ml: 1 }}>
              {openSections["Run Penalties"] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Typography>
          
          <Collapse in={openSections["Run Penalties"]}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  "& .MuiTableRow-root": { transition: "background-color 120ms ease" },
                  "& td, & th": { 
                    borderColor: theme.palette.grey[200],
                    fontSize: { xs: "0.75rem", sm: "0.95rem" },
                    py: { xs: 0.5, sm: 1.25 },
                    px: { xs: 0.25, sm: 1 }
                  },
                }}
              >
                <TableBody>
                  <PenaltyCategory
                    isOpen={true}
                    toggleOpen={() => {}}
                    categoryTitle="Machine Operation Run 1"
                    fields={runPenaltiesQuestions.filter((q: any) => q.penaltyType === "Machine Operation Run 1").map((penalty: any) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled: scoreSheet?.isSubmitted || false,
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={Object.fromEntries(
                      runPenaltiesQuestions
                        .filter((q: any) => q.penaltyType === "Machine Operation Run 1")
                        .map((penalty: any) => [penalty.id, penaltyState[`run_${penalty.id}`] || 0])
                    )}
                    onCheckboxChange={(field) => handleCheckboxChange(field, 'run')}
                    onIncrement={(field, upperBound) => handleIncrement(field, upperBound, 'run')}
                    onDecrement={(field, lowerBound) => handleDecrement(field, lowerBound, 'run')}
                  />
                  <PenaltyCategory
                    isOpen={true}
                    toggleOpen={() => {}}
                    categoryTitle="Machine Operation Run 2"
                    fields={runPenaltiesQuestions.filter((q: any) => q.penaltyType === "Machine Operation Run 2").map((penalty: any) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled: scoreSheet?.isSubmitted || false,
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={Object.fromEntries(
                      runPenaltiesQuestions
                        .filter((q: any) => q.penaltyType === "Machine Operation Run 2")
                        .map((penalty: any) => [penalty.id, penaltyState[`run_${penalty.id}`] || 0])
                    )}
                    onCheckboxChange={(field) => handleCheckboxChange(field, 'run')}
                    onIncrement={(field, upperBound) => handleIncrement(field, upperBound, 'run')}
                    onDecrement={(field, lowerBound) => handleDecrement(field, lowerBound, 'run')}
                  />
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>

        {/* General Penalties Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            mb: 2, 
            fontWeight: 600, 
            color: theme.palette.success.main,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: { xs: "1rem", sm: "1.25rem" }
          }} onClick={() => handleToggleSection("General Penalties")}>
            General Penalties
            <IconButton size="small" sx={{ ml: 1 }}>
              {openSections["General Penalties"] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Typography>
          
          <Collapse in={openSections["General Penalties"]}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  "& .MuiTableRow-root": { transition: "background-color 120ms ease" },
                  "& td, & th": { 
                    borderColor: theme.palette.grey[200],
                    fontSize: { xs: "0.75rem", sm: "0.95rem" },
                    py: { xs: 0.5, sm: 1.25 },
                    px: { xs: 0.25, sm: 1 }
                  },
                }}
              >
                <TableBody>
                  <PenaltyCategory
                    isOpen={true}
                    toggleOpen={() => {}}
                    categoryTitle="General Penalties"
                    fields={generalPenaltiesQuestions.map((penalty: any) => ({
                      fieldId: penalty.id,
                      text: penalty.questionText,
                      points: penalty.pointText,
                      disabled: scoreSheet?.isSubmitted || false,
                      isIncrement: penalty.isIncrement,
                      incrementLowerBound: penalty.incrementLowerBound,
                      incrementUpperBound: penalty.incrementUpperBound,
                      yesOrNo: penalty.yesOrNo,
                    }))}
                    penaltyState={Object.fromEntries(
                      generalPenaltiesQuestions.map((penalty: any) => [penalty.id, penaltyState[`general_${penalty.id}`] || 0])
                    )}
                    onCheckboxChange={(field) => handleCheckboxChange(field, 'general')}
                    onIncrement={(field, upperBound) => handleIncrement(field, upperBound, 'general')}
                    onDecrement={(field, lowerBound) => handleDecrement(field, lowerBound, 'general')}
                  />
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>

        {/* Final submit button */}
        <Button
          variant="contained"
          onClick={() => setOpenAreYouSure(true)}
          disabled={scoreSheet?.isSubmitted || !allFieldsFilled() || hasFieldErrors}
          sx={{
            mt: 3,
            bgcolor: scoreSheet?.isSubmitted 
              ? theme.palette.grey[400] 
              : theme.palette.success.main,
            "&:hover": { 
              bgcolor: scoreSheet?.isSubmitted 
                ? theme.palette.grey[400] 
                : theme.palette.success.dark 
            },
            color: "#fff",
            width: { xs: "100%", sm: "auto" },
            minWidth: { xs: "auto", sm: 200 },
            height: { xs: 44, sm: 48 },
            textTransform: "none",
            borderRadius: 2,
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 600
          }}
        >
          {scoreSheet?.isSubmitted ? "Scores Submitted" : "Submit Final Scores"}
        </Button>

        {/* Confirmation modal */}
        <AreYouSureModal
          open={openAreYouSure}
          handleClose={() => setOpenAreYouSure(false)}
          title="Are you sure you want to submit?"
          handleSubmit={() => handleSubmit()}
        />
      </Container>
    </>
  );
}
