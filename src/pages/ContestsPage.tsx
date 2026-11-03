// ==============================
// Component: ContestsPage
// Main contests listing page with interactive navigation.
// Displays available contests with status indicators and navigation to results.
// ==============================

// ==============================
// React Core
// ==============================
import { useEffect, useState } from "react";

// ==============================
// Router
// ==============================
import { useNavigate, Link } from "react-router-dom";

// ==============================
// UI Libraries & Theme
// ==============================
import Typography from "@mui/material/Typography";
import { Alert, Container, Stack, Button, Box } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import theme from "../theme";
import toast from "react-hot-toast";

// ==============================
// Store Hooks
// ==============================
import { useContestStore } from "../store/primary_stores/contestStore";

// ==============================
// Local Components
// ==============================
import ContestTable from "../components/Tables/ContestTable";
import InteractiveGrid from "../components/Cube";
export default function Contests() {
  // ------------------------------
  // Store State & Actions
  // ------------------------------
  const { allContests, fetchAllContests, isLoadingContest } = useContestStore();
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // ------------------------------
  // Navigation
  // ------------------------------
  const navigate = useNavigate();

  // ==============================
  // Data Loading & Effects
  // ==============================

  // Fetch all contests on component mount
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      try {
        await fetchAllContests(true);
        if (active) setLoadFailed(false);
      } catch {
        if (active) setLoadFailed(true);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchAllContests, retryCount]);

  // function to create data row
  function createData(
    id: number,
    name: string,
    date: string,
    is_open: boolean,
    is_tabulated?: boolean,
    results_published?: boolean,
  ) {
    let status = "";

    if (is_open) {
      status = "In Progress";
    } else if (results_published) {
      status = "Finalized";
    } else if (is_tabulated) {
      status = "Awaiting Release";
    } else {
      status = "Not Started";
    }

    return { id, name, date, status };
  }


  // Navigate to specific contest results
  const handleRowClick = (contestId: number) => {
    const contest = allContests.find((c: any) => c.id === contestId);
    if (contest?.results_published === true) {
      navigate(`/contestresults/${contestId}`);
    } else {
      toast.success(
        "Stay tuned! Results will be available after the official announcement.",
        {
          id: "contest-results-stay-tuned",
          duration: 4000,
          style: {
            background: '#4caf50',
            color: '#fff',
            fontWeight: 600,
            fontSize: '15px',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#4caf50',
          },
        }
      );
    }
  };

  // transforms array into rows
  const rows = allContests
    .map((contest: { id: number; name: string; date: string; is_open: boolean; is_tabulated: boolean; results_published: boolean }) =>
      createData(contest.id, contest.name, contest.date, contest.is_open, contest.is_tabulated, contest.results_published)
    )
    .filter((row: { status: string }) => row.status !== "Not Started")
    .sort((a: { status: string }, b: { status: string }) => {
      const order = { Finalized: 1, "Awaiting Release": 2, "In Progress": 3, "Not Started": 4 };
      return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    });

  return (
    <>
      {/* Title Section */}
      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 3, sm: 5 },
          mt: 2,
          mb: 2,
        }}
      >
        {/* Back to Homepage */}
        <Box sx={{ mb: 1, mt: { xs: 1, sm: 2 } }}>
          <Button
            component={Link}
            to="/"
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
            Back to Homepage
          </Button>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              fontWeight: 400,
              color: theme.palette.primary.main,
              fontFamily: '"DM Serif Display", "Georgia", serif',
              letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}
          >
            Contests
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <InteractiveGrid cellSize={16} gap={3} />
          </Box>
        </Stack>

      </Container>

      {/* Table Container */}
      <Container
        maxWidth="lg"
        sx={{
          backgroundColor: "transparent",
          boxShadow: "none",
          border: "none",
          p: 3,
        }}
      >
        {loadFailed && (
          <Alert severity="warning" sx={{ mb: 2 }} action={
            <Button color="inherit" disabled={isLoadingContest} onClick={() => setRetryCount((count) => count + 1)}>
              Retry
            </Button>
          }>
            Unable to refresh contests. Any contests shown may be out of date. Please try again.
          </Alert>
        )}
        <ContestTable
          rows={rows}
          isLoading={isLoadingContest}
          onRowClick={handleRowClick}
        />
      </Container>
    </>
  );
}
