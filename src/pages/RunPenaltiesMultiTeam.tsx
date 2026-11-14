// ==============================
// Component: RunPenaltiesMultiTeam
// Multi-team penalty scoring interface for run penalties.
// Allows judges to score run penalties for multiple teams across their assigned clusters.
// ==============================

// ==============================
// React Core
// ==============================
import { useEffect } from "react";

// ==============================
// Router
// ==============================
import { useParams, useNavigate } from "react-router-dom";

// ==============================
// Store Hooks
// ==============================
import { useAuthStore } from "../store/primary_stores/authStore";
import { useScoreSheetStore } from "../store/primary_stores/scoreSheetStore";

// ==============================
// Data
// ==============================
import { runPenaltiesQuestions } from "../data/runPenaltiesQuestions";

// ==============================
// Local Components
// ==============================
import MultiTeamPenaltyTable from "../components/Tables/MultiTeamPenaltyTable";

export default function RunPenaltiesMultiTeam() {
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
  const { fetchMultiTeamPenalties } = useScoreSheetStore();

  // ==============================
  // Data Loading & Effects
  // ==============================

  // Redirect judges to their own penalty interface if accessing another judge's URL
  useEffect(() => {
    if (role?.user_type === 3 && parsedJudgeId !== role.user.id) {
      navigate(`/multi-team-run-penalties/${role.user.id}/${contestId}/`);
    }
  }, [judgeId, role, contestId, navigate, parsedJudgeId]);

  // Fetch run penalties data for all teams assigned to the judge
  useEffect(() => {
    if (parsedJudgeId && contestId) {
      fetchMultiTeamPenalties(parsedJudgeId, parseInt(contestId), 4).catch(() => {
        // The scoring table displays the load failure and retry action.
      });
    }
  }, [parsedJudgeId, contestId, fetchMultiTeamPenalties]);

  // ==============================
  // Early Returns & Conditional Rendering
  // ==============================

  // Invalid judge ID - cannot proceed
  if (parsedJudgeId === null) return null;

  // ==============================
  // Main Component Render
  // ==============================

  return (
    <MultiTeamPenaltyTable
      sheetType={4}
      title="Run Penalties - Multi Team"
      teams={[]}
      penalties={runPenaltiesQuestions}
      judgeId={parsedJudgeId}
      contestId={parseInt(contestId!)}
    />
  );
}
