import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { Box, Button, Alert, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Team, Contest } from "../../types";

interface ICoachTeamScoresTable {
  team: Team;
  contest?: Contest | null;
}

export default function CoachTeamScoresTable(props: ICoachTeamScoresTable) {
  const { team, contest } = props;
  const navigate = useNavigate();
  
  // Hide scores if contest is open or not tabulated
  const shouldHideScores = Boolean(contest && contest.results_published !== true);
  
  // Check if team has championship or redesign scores
  const hasChampionshipScores = Boolean(
    team.championship_score || 
    team.championship_total_score || 
    team.advanced_to_championship
  );
  const hasRedesignScores = Boolean(
    team.redesign_score || 
    team.redesign_total_score
  );
  
  return (
    <Box>
      {shouldHideScores && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Results will be visible after the contest ends.
        </Alert>
      )}
      <TableContainer component={Box}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            <TableRow>
              <TableCell align="center">Rank</TableCell>
              <TableCell align="center">Journal</TableCell>
              <TableCell align="center">Presentation</TableCell>
              <TableCell align="center">Machine Design & Operation</TableCell>
              <TableCell align="center">Penalties</TableCell>
              <TableCell align="center">Total Score</TableCell>
              <TableCell align="center">Score Breakdown</TableCell>
            </TableRow>
            <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.team_rank || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.journal_score || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.presentation_score || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.machinedesign_score || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.penalties_score || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {shouldHideScores ? "—" : (team.total_score || 0)}
              </TableCell>
              <TableCell align="center">
                <Stack direction="column" spacing={1} alignItems="center">
                  <Button 
                    onClick={() => navigate(`/score-breakdown/${team.id}`)}
                    disabled={shouldHideScores}
                    size="small"
                    variant="outlined"
                    sx={{ minWidth: "160px" }}
                  >
                    Preliminary
                  </Button>
                  {hasChampionshipScores && (
                    <Button 
                      onClick={() => navigate(`/championship-score-breakdown/${team.id}`)}
                      disabled={shouldHideScores}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: "160px" }}
                    >
                      Championship
                    </Button>
                  )}
                  {hasRedesignScores && (
                    <Button 
                      onClick={() => navigate(`/redesign-score-breakdown/${team.id}`)}
                      disabled={shouldHideScores}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: "160px" }}
                    >
                      Redesign
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
