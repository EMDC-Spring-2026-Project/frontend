// ==============================
// Imports
// ==============================
import * as React from "react";
import {
  Box,
  Alert,
  Button,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import { useEffect, useState, useRef } from "react";

// ==============================
// Store Hooks
// ==============================
import { useAuthStore } from "../store/primary_stores/authStore";
import { useMapCoachToTeamStore } from "../store/map_stores/mapCoachToTeamStore";
import { useMapContestToTeamStore } from "../store/map_stores/mapContestToTeamStore";

// ==============================
// Local Components & Theme
// ==============================
import CoachTeamScoresTable from "../components/Tables/CoachTeamScoresTable";
import theme from "../theme";

// ==============================
// Component: Coach Dashboard
// Shows coach’s teams and their scores in a collapsible table.
// Handles data fetching, preload timing, and page cleanup.
// ==============================
export default function Coach() {
  // ------------------------------
  // Global state (Auth + Stores)
  // ------------------------------
  const { role} = useAuthStore();

  const { teams, fetchTeamsByCoachId, clearTeams } = useMapCoachToTeamStore();

  const {
    contestsForTeams,
    fetchContestsByTeams,
    clearContests,
  } = useMapContestToTeamStore();

  // ------------------------------
  // Local UI State
  // ------------------------------
  const [hasLoaded, setHasLoaded] = useState(false);
  const [teamLoadFailed, setTeamLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const coachId = role?.user.id;
  const isInitialLoadRef = useRef(true);

  // ==============================
  // Data Fetching / Initialization
  // ==============================

  /**
   * Fetch all teams for the logged-in coach.
   * Mark the page as loaded when the fetch completes.
   * Clear teams on unmount.
   */
  useEffect(() => {
    let active = true;
    setHasLoaded(false);
    setTeamLoadFailed(false);
    if (coachId) {
      void fetchTeamsByCoachId(coachId)
        .catch(() => { if (active) setTeamLoadFailed(true); })
        .finally(() => {
          if (active) {
            setHasLoaded(true);
            isInitialLoadRef.current = false;
          }
        });
    }
    return () => {
      active = false;
      clearTeams();
    };
  }, [coachId, fetchTeamsByCoachId, clearTeams, retryCount]);

  /**
   * Once teams are available, fetch contests for those teams.
   * Clear contest mapping on unmount.
   */
  useEffect(() => {
    let refreshInFlight = false;
    const loadContestAssignments = (forceRefresh = false) => {
      if (teams.length === 0 || refreshInFlight) return;

      refreshInFlight = true;
      void fetchContestsByTeams(teams, forceRefresh)
        .catch(() => undefined)
        .finally(() => {
          refreshInFlight = false;
        });
    };

    if (teams.length > 0) {
      loadContestAssignments();
    }

    const refreshContestAssignments = () => {
      if (document.visibilityState === "visible" && teams.length > 0) {
        // Another organizer may have changed a team's contest while this tab
        // was inactive, so bypass the short-lived cache when returning.
        loadContestAssignments(true);
      }
    };
    window.addEventListener("focus", refreshContestAssignments);
    document.addEventListener("visibilitychange", refreshContestAssignments);

    return () => {
      window.removeEventListener("focus", refreshContestAssignments);
      document.removeEventListener("visibilitychange", refreshContestAssignments);
      clearContests();
    };
  }, [teams, fetchContestsByTeams, clearContests]);


  /**
   * When the page is being hidden (e.g., navigation/back), clean up
   * contest and team mappings to avoid stale data when returning.
   */
  useEffect(() => {
    const handlePageHide = () => {
      clearContests();
      clearTeams();
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  // ==============================
  // Helpers: Row Data Construction
  // ==============================

  const createData = (
    id: number,
    name: string,
    contest: string,
    isDisqualified: boolean
  ) => ({
    id,
    name,
    contest,
    isDisqualified,
  });

  const rows = teams.map((team) =>
    createData(
      team.id,
      team.team_name,
      contestsForTeams[team.id]?.name || "—",
      team.organizer_disqualified
    )
  );

  // ==============================
  // Row Component (Collapsible)
  // One row per team; expands to show scores table.
// ==============================
  const Row = ({
    row,
    index,
  }: {
    row: ReturnType<typeof createData>;
    index: number;
  }) => {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <TableRow
          sx={{ "& > *": { borderBottom: "unset" } }}
          onClick={() => setOpen(!open)}
          hover
        >
          <TableCell>
            <IconButton aria-label="expand row" size="small">
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row">
            {row.name}
          </TableCell>
          <TableCell>{row.contest}</TableCell>
          <TableCell>
            {row.isDisqualified ? (
              <Typography sx={{ color: "red" }}>Disqualified</Typography>
            ) : (
              "Active"
            )}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ m: 2 }}>
                <CoachTeamScoresTable
                  team={teams[index]}
                  contest={contestsForTeams[teams[index].id]}
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  // ==============================
  // Reusable UI: StatCard
  // Displays a numeric value with an explanatory label.
// ==============================
  const StatCard = ({
    value,
    label,
  }: {
    value: number | string;
    label: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.grey[200]}`,
        background: `linear-gradient(135deg, #ffffff 0%, #fafafa 100%)`,
        boxShadow: `0 2px 8px rgba(76, 175, 80, 0.08)`,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: `0 4px 16px rgba(76, 175, 80, 0.12)`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: theme.palette.success.light,
            opacity: 0.1,
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.success.dark,
            lineHeight: 1,
            mb: 0.5,
          }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  // ==============================
  // Render
  // ==============================
  return (
    <Box sx={{ pb: 8, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <Container maxWidth="lg">
        {!hasLoaded && <Alert severity="info" sx={{ mt: 2 }}>Loading your teams…</Alert>}
        {teamLoadFailed && (
          <Alert severity="error" sx={{ mt: 2 }} action={
            <Button color="inherit" onClick={() => setRetryCount((count) => count + 1)}>Retry</Button>
          }>
            Unable to load your teams. Please try again.
          </Alert>
        )}
        {/* Fade-in wrapper for the page once data is ready */}
        <Box
          sx={{
            opacity: hasLoaded ? 1 : 0,
            transition: hasLoaded
              ? `opacity ${
                  isInitialLoadRef.current ? "0.6s" : "0.1s"
                } ease-in`
              : "none",
            pointerEvents: hasLoaded ? "auto" : "none",
          }}
        >
          {/* ------------------------------
              Header: Coach & Summary
          ------------------------------ */}
          <Stack spacing={1} sx={{ mb: 2, mt: 2 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 400,
                color: theme.palette.success.main,
                fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.5rem" },
                fontFamily: '"DM Serif Display", "Georgia", serif',
                letterSpacing: "0.02em",
                lineHeight: 1.2,
              }}
            >
              Coach Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {role?.user?.first_name} {role?.user?.last_name}
            </Typography>
          </Stack>

          {/* ------------------------------
              Stat Cards
          ------------------------------ */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard value={teams.length} label="Teams Coached" />
            </Grid>
          </Grid>

          {/* ------------------------------
              Teams Overview (Collapsible Table)
          ------------------------------ */}
          <Box
            sx={{
              border: `1px solid ${theme.palette.grey[300]}`,
              borderRadius: 3,
              backgroundColor: "#fff",
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                backgroundColor: " rgba(46, 125, 50, 0.06)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Teams Overview
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ px: 3, pb: 3 }}>
              {teams.length > 0 ? (
                <TableContainer component={Box}>
                  <Table>
                    <TableBody>
                      {rows.map((row, index) => (
                        <Row key={row.id} row={row} index={index} />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No teams assigned yet.</Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
