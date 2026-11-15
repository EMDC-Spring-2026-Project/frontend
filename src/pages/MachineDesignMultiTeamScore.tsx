// ==============================
// Component: MultiTeamMachineDesignScore
// Multi-team scoring interface for machine design scoresheets.
// Allows judges to score multiple teams across their assigned clusters in one interface.
// ==============================

// ==============================
// React Core
// ==============================
import { useEffect, useState } from "react";

// ==============================
// Router
// ==============================
import { useParams, useNavigate } from "react-router-dom";

// ==============================
// Store Hooks
// ==============================
import { useAuthStore } from "../store/primary_stores/authStore";
import { useMapClusterJudgeStore } from "../store/map_stores/mapClusterToJudgeStore";
import useClusterTeamStore from "../store/map_stores/mapClusterToTeamStore";

// ==============================
// API & Data
// ==============================
import { api } from "../lib/api";
import { machineDesignQuestions } from "../data/machineDesignQuestions";

// ==============================
// Types
// ==============================
import { ClusterWithContest, ScoreSheetMappingWithSheet, Team, ScoreSheet, Question } from "../types";

// ==============================
// Local Components
// ==============================
import MultiTeamScoreSheet from "../components/Tables/MultiTeamScoreTable";

export default function MultiTeamMachineDesignScore() {
  // ------------------------------
  // Route Parameters & Authentication
  // ------------------------------
  const { role } = useAuthStore();
  const { judgeId, contestId } = useParams();
  const navigate = useNavigate();
  const parsedJudgeId = judgeId ? parseInt(judgeId, 10) : null;

  // ------------------------------
  // Store State & Actions
  // ------------------------------
  const { fetchAllClustersByJudgeId } = useMapClusterJudgeStore();
  const fetchTeamsByClusterId = useClusterTeamStore((state) => state.fetchTeamsByClusterId);

  // ------------------------------
  // Local UI State
  // ------------------------------
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [isDataReady, setIsDataReady] = useState(false);

  // ==============================
  // Data Loading & Effects
  // ==============================

  // Redirect judges to their own scoring interface if accessing another judge's URL
  useEffect(() => {
    if (role?.user_type === 3 && parsedJudgeId !== role.user.id) {
      navigate(`/multi-team-machinedesign-score/${role.user.id}/${contestId}/`);
    }
  }, [judgeId, role, contestId, navigate, parsedJudgeId]);

  // Fetch clusters, teams, and scoresheets data for multi-team scoring interface
  useEffect(() => {
    const fetchData = async () => {
      if (!parsedJudgeId) return;
      
      try {
        const allClusters = await fetchAllClustersByJudgeId(parsedJudgeId);
        const parsedContestId = contestId ? parseInt(contestId, 10) : null;
        const clusters: ClusterWithContest[] = parsedContestId 
          ? allClusters.filter((c: ClusterWithContest) => c.contest_id === parsedContestId)
          : allClusters;
        
        const clusterIds = clusters.map((c: ClusterWithContest) => c.id);
        
        if (clusterIds.length === 0) {
          setTeams([]);
          setIsDataReady(true);
          return;
        }
        
        const [clusterResults, teamResults] = await Promise.all([
          Promise.all(clusterIds.map(async (clusterId: number): Promise<ScoreSheet[]> => {
            try {
              const response = await api.get<{ ScoreSheets: ScoreSheetMappingWithSheet[] }>(
                `/api/mapping/scoreSheet/getSheetsByJudgeAndCluster/${parsedJudgeId}/${clusterId}/`
              );
              const scoreSheets = response.data?.ScoreSheets || [];
              
              return scoreSheets
                .filter((item: ScoreSheetMappingWithSheet) => item.mapping?.sheetType === 3)
                .map((item: ScoreSheetMappingWithSheet): ScoreSheet => ({
                  ...(item.scoresheet || {}),
                  teamId: item.mapping.teamid,
                  judgeId: item.mapping.judgeid,
                  sheetType: item.mapping.sheetType,
                } as ScoreSheet));
            } catch (error) {
              console.error(`Error fetching scoresheets for cluster ${clusterId}:`, error);
              return [];
            }
          })),
          Promise.all(clusterIds.map(async (clusterId: number): Promise<Team[]> => {
            try {
              return await fetchTeamsByClusterId(clusterId);
            } catch (error) {
              console.error(`Error fetching teams for cluster ${clusterId}:`, error);
              return [];
            }
          }))
        ]);
        
        const allSheets = clusterResults.flat();
        const allTeams = teamResults.flat();
        
        const teamNameMap = new Map<number, string>();
        allTeams.forEach((team: Team) => {
          teamNameMap.set(team.id, team.team_name || `Team ${team.id}`);
        });
        
        const teamMap = new Map<number, { id: number; name: string }>();
        allSheets.forEach((sheet: ScoreSheet) => {
          if (sheet.teamId) {
            const teamName = teamNameMap.get(sheet.teamId) || `Team ${sheet.teamId}`;
            teamMap.set(sheet.teamId, {
              id: sheet.teamId,
              name: teamName
            });
          }
        });
        
        setTeams(Array.from(teamMap.values()));
        setIsDataReady(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setTeams([]);
        setIsDataReady(true);
      }
    };

    fetchData();
  }, [parsedJudgeId, contestId, fetchAllClustersByJudgeId, fetchTeamsByClusterId]);

  // ==============================
  // Early Returns & Conditional Rendering
  // ==============================

  // Invalid judge ID - cannot proceed
  if (parsedJudgeId === null) return null;

  // ==============================
  // Main Component Render
  // ==============================

  return (
    <MultiTeamScoreSheet
      sheetType={3}
      title="Machine Design and Operation Score"
      teams={teams}
      questions={machineDesignQuestions as Question[]}
      judgeId={parsedJudgeId}
      seperateJrAndSr={true}
      isDataReady={isDataReady}
    />
  );
}
