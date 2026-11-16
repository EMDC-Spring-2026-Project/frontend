// ==============================
// Component: GeneralPenaltiesMultiTeam
// Multi-team penalty scoring interface for general penalties.
// Allows judges to score general penalties for multiple teams across their assigned clusters.
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
import { generalPenaltiesQuestions } from "../data/generalPenaltiesQuestions";

// ==============================
// Local Components
// ==============================
import MultiTeamPenaltyTable from "../components/Tables/MultiTeamPenaltyTable";

export default function GeneralPenaltiesMultiTeam() {
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
      navigate(`/multi-team-general-penalties/${role.user.id}/${contestId}/`);
    }
  }, [judgeId, role, contestId, navigate, parsedJudgeId]);

  // Fetch general penalties data for all teams assigned to the judge
  useEffect(() => {
    if (parsedJudgeId && contestId) {
      fetchMultiTeamPenalties(parsedJudgeId, parseInt(contestId), 5).catch(() => {
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
      sheetType={5}
      title="General Penalties - Multi Team"
      teams={[]}
      penalties={generalPenaltiesQuestions}
      judgeId={parsedJudgeId}
      contestId={parseInt(contestId!)}
    />
  );
}
