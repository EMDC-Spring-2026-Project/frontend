import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useContestStore } from "../../store/primary_stores/contestStore";
import { useMapContestOrganizerStore } from "../../store/map_stores/mapContestToOrganizerStore";
import { useMapContestJudgeStore } from "../../store/map_stores/mapContestToJudgeStore";
import { useMapClusterToContestStore } from "../../store/map_stores/mapClusterToContestStore";
import { useAuthStore } from "../../store/primary_stores/authStore";
import theme from "../../theme";
import { Contest } from "../../types";

interface ContestOverviewTableProps {
  contests?: Contest[]; 
}

export default function ContestOverviewTable({ contests: propContests }: ContestOverviewTableProps = {}) {
  // Use stable selectors for store functions and state
  const allContests = useContestStore((s) => s.allContests);
  const fetchAllContests = useContestStore((s) => s.fetchAllContests);

  const organizerContests = useMapContestOrganizerStore((s) => s.contests);
  const fetchContestsByOrganizerId = useMapContestOrganizerStore((s) => s.fetchContestsByOrganizerId);

  const judgeContests = useMapContestJudgeStore((s) => s.judgeContests);
  const getContestsByJudgeId = useMapContestJudgeStore((s) => s.getContestsByJudgeId);
  const fetchJudgesForMultipleContests = useMapContestJudgeStore((s) => s.fetchJudgesForMultipleContests);
  const contestJudges = useMapContestJudgeStore((s) => s.contestJudges);

  const contestClusters = useMapClusterToContestStore((s) => s.contestClusters);
  const fetchClustersForMultipleContests = useMapClusterToContestStore((s) => s.fetchClustersForMultipleContests);

  const role = useAuthStore((s) => s.role);

  const [isLoading, setIsLoading] = useState(false);
  const [openJudgeDialog, setOpenJudgeDialog] = useState<number | null>(null);

  // Safe date formatting helper
  const safeFormatDate = (d?: string | Date) => {
    const dt = d ? new Date(d) : null;
    return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString() : String(d || "—");
  };

  /**
   * Determines which contests to display based on user role:
   * - Organizers: only their assigned contests
   * - Judges: their assigned contest
   * - Admins: all contests
   * Filters out ended contests (is_open === false && is_tabulated === true).
   * Memoized to prevent infinite loops in useEffect.
   */
  const contests = useMemo(() => {
    const sourceContests = propContests || (
      role?.user_type === 2 ? organizerContests : 
      role?.user_type === 3 ? judgeContests :
      allContests
    );
    return sourceContests.filter(contest => !(contest.is_open === false && contest.is_tabulated === true));
  }, [propContests, role?.user_type, organizerContests, judgeContests, allContests]);

  /**
   * Loads contest data based on user role.
   * Skips fetching if parent component provides contests.
   */
  useEffect(() => {
    if (!role) return;

    if (propContests && propContests.length > 0) return;

    let mounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (role.user_type === 2 && role.user?.id) {
          await fetchContestsByOrganizerId(role.user.id);
        } else if (role.user_type === 3 && role.user?.id) {
          await getContestsByJudgeId(role.user.id);
        } else {
          await fetchAllContests();
        }
      } catch (err) {
        console.warn("Backend not available", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [
    role?.user_type,
    role?.user?.id,
    fetchAllContests,
    fetchContestsByOrganizerId,
    getContestsByJudgeId,
    propContests, //effect re-evaluates if parent supplies contests later
  ]);

  /**
   * Memoizes contest IDs as a sorted comma-separated string.
   * Used as a stable dependency for useEffect to prevent unnecessary refetches.
   */
  const contestIdsString = useMemo(() => {
    return contests.map(contest => contest.id).sort().join(',');
  }, [contests]);

  /**
   * Fetches judges and clusters for each contest in parallel.
   * Only runs when contestIdsString changes.
   */
  useEffect(() => {
    if (!contestIdsString) return;

    let mounted = true;
    const ids = contestIdsString.split(",").map((s) => Number(s)).filter(Boolean);
    if (ids.length === 0) return;

    const loadData = async () => {
      try {
        await Promise.all([
          fetchJudgesForMultipleContests(ids),
          fetchClustersForMultipleContests(ids),
        ]);
      } catch (err) {
        if (mounted) {
          console.warn("Failed to fetch contest data", err);
        }
      }
    };


    loadData();

    return () => { mounted = false; };
  }, [contestIdsString, fetchJudgesForMultipleContests, fetchClustersForMultipleContests]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (contests.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 3}}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Contest Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View contest details, clusters, and judge assignments
          </Typography>
        </Box>
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          height="200px"
          sx={{ 
            border: `1px solid ${theme.palette.grey[300]}`,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[50]
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No contests available. 
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      {/* Page header with title and description */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Active/Upcoming Contests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View contest details, clusters, and judge assignments
        </Typography>
      </Box>

      {/* Grid layout for contest cards */}
      <Grid container spacing={3}>
        {contests.map((contest) => (
          <Grid item xs={12} md={6} lg={4} key={contest.id}>
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 4,
                backgroundColor: "#fff",
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  boxShadow: "0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)",
                  transform: "translateY(-4px) scale(1.02)",
                  borderColor: theme.palette.success.main,
                  "&::before": {
                    opacity: 1,
                  },
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                },
              }}
            >
              <CardContent sx={{ p: 3, position: "relative", zIndex: 1 }}>
                {/* Contest header with name and status */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.grey[800],
                      fontSize: "1.1rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {contest.name}
                  </Typography>
                  {/* Status indicator chip */}
                  <Chip
                    label={contest.is_open ? "Open" : "Not Open"}
                    color={contest.is_open ? "success" : "error"}
                    size="small"
                    sx={{ 
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.65rem",
                      height: "24px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {safeFormatDate(contest.date)}
                </Typography>

                {/* Contest statistics section with key metrics */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2, border: `1px solid ${theme.palette.grey[100]}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: theme.palette.grey[700] }}>
                    Contest Details
                  </Typography>
                  
                  {/* Grid layout for contest metrics */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#fff", borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>Clusters:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        {contestClusters[contest.id]?.length || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#fff", borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>Judges:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {contestJudges[contest.id]?.length || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#fff", borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>Status:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem", color: contest.is_open ? theme.palette.success.main : theme.palette.error.main }}>
                        {contest.is_open ? "Open" : "Not Open"}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#fff", borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>Date:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.grey[600] }}>
                        {safeFormatDate(contest.date)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Display assigned clusters as chips */}
                {contestClusters[contest.id]?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: theme.palette.grey[700] }}>
                      Clusters
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {contestClusters[contest.id].map((cluster) => (
                        <Chip
                          key={cluster.id ?? cluster.cluster_name}
                          label={cluster.cluster_name}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            borderColor: theme.palette.success.main,
                            color: theme.palette.success.main,
                            backgroundColor: theme.palette.success.light + "20",
                            "&:hover": {
                              backgroundColor: theme.palette.success.light,
                              transform: "scale(1.05)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Display assigned judges as chips */}
                {contestJudges[contest.id]?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: theme.palette.grey[700] }}>
                      Judges
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {contestJudges[contest.id].slice(0, 4).map((judge) => (
                        <Chip
                          key={judge.id ?? `${judge.first_name}-${judge.last_name}`}
                          label={`${judge.first_name} ${judge.last_name}`}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            backgroundColor: theme.palette.primary.light + "20",
                            "&:hover": {
                              backgroundColor: theme.palette.primary.light,
                              transform: "scale(1.05)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        />
                      ))}
                      {contestJudges[contest.id].length > 4 && (
                        <Chip
                          label={`+${contestJudges[contest.id].length - 4} more`}
                          size="small"
                          variant="outlined"
                          onClick={() => setOpenJudgeDialog(contest.id)}
                          sx={{ 
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            borderColor: theme.palette.grey[400],
                            color: theme.palette.grey[600],
                            backgroundColor: theme.palette.grey[100],
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: theme.palette.grey[200],
                              transform: "scale(1.05)",
                              borderColor: theme.palette.primary.main,
                              color: theme.palette.primary.main,
                            },
                            transition: "all 0.2s ease",
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog to show all judges */}
      {openJudgeDialog !== null && contestJudges[openJudgeDialog] && (
        <Dialog
          open={openJudgeDialog !== null}
          onClose={() => setOpenJudgeDialog(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: "1.25rem",
              borderBottom: `1px solid ${theme.palette.grey[200]}`,
              pb: 2,
            }}
          >
            All Judges
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 400,
                mt: 0.5,
                fontSize: "0.875rem",
              }}
            >
              {contestJudges[openJudgeDialog].length} judge{contestJudges[openJudgeDialog].length !== 1 ? "s" : ""} assigned
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <List sx={{ p: 0 }}>
              {contestJudges[openJudgeDialog].map((judge, index) => (
                <ListItem
                  key={judge.id ?? `${judge.first_name}-${judge.last_name}`}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: index % 2 === 0 ? theme.palette.grey[50] : "#fff",
                    border: `1px solid ${theme.palette.grey[200]}`,
                    "&:hover": {
                      backgroundColor: theme.palette.primary.light + "10",
                      borderColor: theme.palette.primary.main,
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ListItemText
                    primary={`${judge.first_name} ${judge.last_name}`}
                    secondary={judge.phone_number || ""}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      color: theme.palette.grey[800],
                      fontSize: "0.95rem",
                    }}
                    secondaryTypographyProps={{
                      fontSize: "0.85rem",
                      color: theme.palette.text.secondary,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.grey[200]}` }}>
            <Button
              onClick={() => setOpenJudgeDialog(null)}
              variant="contained"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                fontWeight: 600,
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
