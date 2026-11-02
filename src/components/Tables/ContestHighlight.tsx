import { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import GavelIcon from "@mui/icons-material/Gavel";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useParams } from "react-router-dom";
import theme from "../../theme";
import { useMapContestToTeamStore } from "../../store/map_stores/mapContestToTeamStore";
import { useContestStore } from "../../store/primary_stores/contestStore";
import { api } from "../../lib/api";

export default function ContestHighlightPage() {
  const { contestId } = useParams<{ contestId: string }>();
  const contestIdNumber = contestId ? parseInt(contestId, 10) : null;
  
  const { isLoadingContest } = useContestStore();
  const { teamsByContest, isLoadingMapContestToTeam } = useMapContestToTeamStore();
  
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [totalJudges, setTotalJudges] = useState<number | null>(null);
  const [isLoadingJudgeCount, setIsLoadingJudgeCount] = useState(false);
  const [mostPointsTeam, setMostPointsTeam] = useState<string>("N/A");

  // Request only an aggregate count for this public page, never judge details.
  useEffect(() => {
    if (!contestIdNumber) return;
    let isActive = true;
    setIsLoadingJudgeCount(true);

    api
      .get(`/api/mapping/judgeToContest/getPublicJudgeCount/${contestIdNumber}/`)
      .then((response) => {
        if (isActive) setTotalJudges(response.data.judge_count);
      })
      .catch((error) => {
        console.error("Failed to load contest judge count:", error);
        if (isActive) setTotalJudges(null);
      })
      .finally(() => {
        if (isActive) setIsLoadingJudgeCount(false);
      });

    return () => {
      isActive = false;
    };
  }, [contestIdNumber]);

  // Count total teams
  useEffect(() => {
    if (teamsByContest && teamsByContest.length > 0) {
      setTotalTeams(teamsByContest.length);

      // Find team with the highest total_score
      const highest = teamsByContest.reduce((max, t) =>
        t.total_score > (max?.total_score || 0) ? t : max, teamsByContest[0]
      );
      if (highest) setMostPointsTeam(`${highest.team_name} – ${highest.total_score}`);
    } else {
      setTotalTeams(0);
    }
  }, [teamsByContest]);

  if (isLoadingContest || isLoadingMapContestToTeam) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const highlights = [
    {
      id: 1,
      title: "Number of Participating Teams",
      value: totalTeams,
      iconBg: theme.palette.success.light + "55",
      icon: <GroupsIcon sx={{ fontSize: 40, color: theme.palette.success.dark, mb: 1 }} />,
    },
    {
      id: 2,
      title: "Number of Judges",
      value: isLoadingJudgeCount ? "Loading…" : totalJudges ?? "—",
      iconBg: theme.palette.warning.light + "55",
      icon: <GavelIcon sx={{ fontSize: 40, color: theme.palette.warning.dark, mb: 1 }} />,
    },
    {
      id: 3,
      title: "Most Points",
      value: mostPointsTeam,
      iconBg: theme.palette.primary.light + "55",
      icon: <MilitaryTechIcon sx={{ fontSize: 40, color: theme.palette.primary.dark, mb: 1 }} />,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", px: 2 }}>
      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {highlights.map((item) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            key={item.id}
            sx={{ display: "flex", justifyContent: "center" }}
          >
            <Card
              elevation={4}
              sx={{
                width: "100%",
                maxWidth: 330,
                borderRadius: 4,
                backgroundColor: theme.palette.background.paper,
                textAlign: "center",
                p: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    backgroundColor: item.iconBg,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  {item.icon}
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    mb: 1,
                    color: theme.palette.text.primary,
                  }}
                >
                  {item.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.success.main,
                  }}
                >
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
