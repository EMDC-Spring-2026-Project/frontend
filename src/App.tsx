import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import Judging from "./pages/Judging";
import Login from "./pages/Login";
import Organizer from "./pages/Organizer";
import SetPassword from "./pages/SetPassword";
import ManageContest from "./pages/ManageContest";
import Coach from "./pages/Coach";
import JournalScore from "./pages/JournalScore";
import PresentationScore from "./pages/PresentationScore";
import MachineDesignScore from "./pages/MachineDesignScore";
import Admin from "./pages/Admin";
import InternalResults from "./pages/InternalResults";
import GeneralPenalties from "./pages/GeneralPenalties";
import ScoreBreakdown from "./pages/ScoreBreakdown";
import RunPenalties from "./pages/RunPenalties";

import AdminSpecialAwardsPage from "./pages/AdminSpecialAwards";
import OrganizerSpecialAwards from "./pages/OrganizerSpecialAwards";
import JudgeSpecialAwards from "./pages/JudgeSpecialAwards";
import RedesignScore from "./pages/RedesignScore";
import MultiTeamPresentationScore from "./pages/PresentationMultiTeamScore";
import MultiTeamJournalScore from "./pages/JournalMultiTeamScore";
import MultiTeamMachineDesignScore from "./pages/MachineDesignMultiTeamScore";
import ChampionshipScore from "./pages/ChampionshipScore";
import GeneralPenaltiesMultiTeam from "./pages/GeneralPenaltiesMultiTeam";
import RunPenaltiesMultiTeam from "./pages/RunPenaltiesMultiTeam";
import ChampionshipScoreBreakdown from "./pages/ChampionshipScoreBreakdown";
import RedesignScoreBreakdown from "./pages/RedesignScoreBreakdown";
import ContestScores from "./pages/ContestScores";
import ContestPage from "./pages/ContestsPage";
import Logout from "./pages/Logout";

import Navbar from "./components/Navbar";
import Preloader from "./components/Preloader";
import Ranking from "./components/Tables/Rankings";

import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import { Toaster } from "react-hot-toast";

import { useAuthStore } from "./store/primary_stores/authStore";

function App() {
  const location = useLocation();
  const currentLink = location.pathname;

  const {
    isAuthenticated,
    role,
    showPreloader,
    setShowPreloader,
  } = useAuthStore();

  // Track only the "first load" splash preloader for the login page
  const [initialLoad, setInitialLoad] = useState(true);
  const onLoginPage =
    currentLink === "/login" || currentLink === "/login/";
  const skipPreloader = location.state?.skipPreloader;

  // Skip if coming from navbar login button
  useEffect(() => {
    if (!initialLoad || !onLoginPage || skipPreloader) return;

    setShowPreloader(true);
    const timer = setTimeout(() => {
      setShowPreloader(false);
      setInitialLoad(false);
    }, 1700); // how long you want the splash preloader

    return () => clearTimeout(timer);
  }, [initialLoad, onLoginPage, skipPreloader, setShowPreloader]);

  return (
    <>
      <ThemeProvider theme={theme}>
        {/* Full-screen overlay; page renders under this */}
        <Preloader show={showPreloader} />

        {/* Hide navbar on auth pages */}
        {currentLink !== "/set-password/" &&
          currentLink !== "/forgot-password/" &&
          currentLink !== "/login/" &&
          currentLink !== "/signup/" && <Navbar />}

        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/forgot-password/" element={<ForgotPassword />} />
          <Route path="/contestresults/:contestId" element={<ContestScores />} />
          <Route path="/rank" element={<Ranking />} />
          <Route path="/contestPage/" element={<ContestPage />} />
          <Route path="/set-password/" element={<SetPassword />} />

          {/* Always render Login; preloader covers it when needed */}
          <Route path="/login/" element={<Login />} />

          {/* Auth-gated */}
          {isAuthenticated && role?.user_type != 4 && (
            <Route path="/judging/:judgeId/" element={<Judging />} />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/journal-score/:judgeId/:teamId/"
              element={<JournalScore />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/presentation-score/:judgeId/:teamId/"
              element={<PresentationScore />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/machine-score/:judgeId/:teamId/"
              element={<MachineDesignScore />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/general-penalties/:judgeId/:teamId/"
              element={<GeneralPenalties />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/run-penalties/:judgeId/:teamId/"
              element={<RunPenalties />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/redesign-score/:judgeId/:teamId/"
              element={<RedesignScore />}
            />
          )}

          {isAuthenticated && (
            <Route path="/awards/" element={<AdminSpecialAwardsPage />} />
          )}
          {isAuthenticated && (
            <Route
              path="/organizerAwards/"
              element={<OrganizerSpecialAwards />}
            />
          )}
          {isAuthenticated && (
            <Route
              path="/championship-score/:judgeId/:teamId/"
              element={<ChampionshipScore />}
            />
          )}
          {isAuthenticated && (
            <Route path="/judgeAwards/" element={<JudgeSpecialAwards />} />
          )}

          {isAuthenticated && (
            <Route path="/MultiTeam/" element={<MultiTeamPresentationScore />} />
          )}
          {isAuthenticated && (
            <Route
              path="/multi-team-machinedesign-score/:judgeId/:contestId/"
              element={<MultiTeamMachineDesignScore />}
            />
          )}
          {isAuthenticated && (
            <Route
              path="/multi-team-journal-score/:judgeId/:contestId/"
              element={<MultiTeamJournalScore />}
            />
          )}
          {isAuthenticated && (
            <Route
              path="/multi-team-presentation-score/:judgeId/:contestId/"
              element={<MultiTeamPresentationScore />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/multi-team-general-penalties/:judgeId/:contestId/"
              element={<GeneralPenaltiesMultiTeam />}
            />
          )}
          {isAuthenticated && role?.user_type != 4 && (
            <Route
              path="/multi-team-run-penalties/:judgeId/:contestId/"
              element={<RunPenaltiesMultiTeam />}
            />
          )}

          {isAuthenticated && <Route path="/logout/" element={<Logout />} />}

          {/* Role-specific */}
          {role?.user_type == 2 && (
            <Route path="/organizer/" element={<Organizer />} />
          )}

          {/* Protected internal results */}
          {(role?.user_type == 1 || role?.user_type == 2) && (
            <Route
              path="/results/:contestId"
              element={<InternalResults />}
            />
          )}

          {isAuthenticated && (
            <Route
              path="/manage-contest/:contestId/"
              element={<ManageContest />}
            />
          )}
          {role?.user_type == 4 && (
            <Route path="/coach/" element={<Coach />} />
          )}
          {role?.user_type == 1 && (
            <Route path="/admin/" element={<Admin />} />
          )}
          {isAuthenticated && (
            <Route
              path="/score-breakdown/:teamId"
              element={<ScoreBreakdown />}
            />
          )}
          {isAuthenticated && (
            <Route
              path="/championship-score-breakdown/:teamId"
              element={<ChampionshipScoreBreakdown />}
            />
          )}
          {isAuthenticated && (
            <Route
              path="/redesign-score-breakdown/:teamId"
              element={<RedesignScoreBreakdown />}
            />
          )}

          {isAuthenticated && (
            <Route
              path="/score-breakdown/:teamId"
              element={<ScoreBreakdown />}
            />
          )}
        </Routes>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#ffffff",
              color: "#1a1a1a",
              borderRadius: "24px",
              padding: "18px 28px",
              boxShadow:
                "0 8px 24px rgba(76, 175, 80, 0.2), 0 0 0 1px rgba(76, 175, 80, 0.1)",
              fontFamily: "Open Sans, sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              minWidth: "320px",
              border: "none",
              position: "relative",
              overflow: "hidden",
              backgroundImage:
                "radial-gradient(circle at 0% 50%, rgba(76, 175, 80, 0.08) 0%, transparent 50%)",
            },
            success: {
              duration: 4000,
              iconTheme: {
                primary: "#4caf50",
                secondary: "#ffffff",
              },
              style: {
                background: "#ffffff",
                color: "#166534",
                borderRadius: "24px",
                padding: "18px 28px",
                boxShadow:
                  "0 8px 24px rgba(76, 175, 80, 0.25), 0 0 0 1px rgba(76, 175, 80, 0.1)",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                minWidth: "320px",
                border: "none",
                position: "relative",
                overflow: "hidden",
                backgroundImage:
                  "radial-gradient(ellipse 120% 100% at 0% 50%, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.06) 40%, transparent 70%)",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#dc2626",
                secondary: "#ffffff",
              },
              style: {
                background: "#ffffff",
                color: "#991b1b",
                borderRadius: "24px",
                padding: "18px 28px",
                boxShadow:
                  "0 8px 24px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(220, 38, 38, 0.1)",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                minWidth: "320px",
                border: "none",
                position: "relative",
                overflow: "hidden",
                backgroundImage:
                  "radial-gradient(ellipse 120% 100% at 0% 50%, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.06) 40%, transparent 70%)",
              },
            },
            loading: {
              iconTheme: {
                primary: "#4caf50",
                secondary: "#ffffff",
              },
              style: {
                background: "#ffffff",
                color: "#4caf50",
                borderRadius: "24px",
                padding: "18px 28px",
                boxShadow:
                  "0 8px 24px rgba(76, 175, 80, 0.2), 0 0 0 1px rgba(76, 175, 80, 0.1)",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                minWidth: "320px",
                border: "none",
                position: "relative",
                overflow: "hidden",
                backgroundImage:
                  "radial-gradient(ellipse 120% 100% at 0% 50%, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 40%, transparent 70%)",
              },
            },
          }}
        />
      </ThemeProvider>
    </>
  );
}

export default App;
