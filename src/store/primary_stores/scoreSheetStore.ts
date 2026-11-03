// ==============================
// Store: ScoreSheet Store
// Comprehensive scoresheet management with caching, multi-team operations, and breakdown handling.
// Manages individual and bulk scoresheet operations with performance optimizations.
// ==============================

// ==============================
// Core Dependencies
// ==============================
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ==============================
// API & Notifications
// ==============================
import { api } from "../../lib/api";
import toast from "react-hot-toast";

// ==============================
// Types
// ==============================
import { ScoreSheet, ScoreSheetDetails } from "../../types";

// ==============================
// Types & Interfaces
// ==============================

interface ScoreSheetState {
  // Scoresheet data
  scoreSheet: ScoreSheet | null;
  createdScoreSheets: ScoreSheet[]; // Array to store created score sheets
  multipleScoreSheets: ScoreSheet[] | null;

  // Loading and error states
  isLoadingScoreSheet: boolean;
  scoreSheetError: string | null;

  // Breakdown data and caching
  scoreSheetBreakdown: ScoreSheetDetails;
  scoreSheetBreakdownByTeam?: { [teamId: number]: ScoreSheetDetails };
  scoreBreakdownCacheTsByTeam?: { [teamId: number]: number };

  // Individual scoresheet operations
  fetchScoreSheetById: (scoresId: number) => Promise<void>;
  createScoreSheet: (data: Partial<ScoreSheet>) => Promise<void>;
  editScoreSheet: (data: Partial<ScoreSheet>) => Promise<void>;
  updateScores: (data: Partial<ScoreSheet>) => Promise<void>;
  submitScoreSheet: (data: Partial<ScoreSheet>) => Promise<void>;
  editScoreSheetField: (id: number, field: string | number, newValue: any) => Promise<void>;
  deleteScoreSheet: (scoresId: number) => Promise<void>;

  // Bulk operations
  createSheetsForTeamsInCluster: (
    judgeId: number,
    clusterId: number,
    penalties: boolean,
    presentation: boolean,
    journal: boolean,
    mdo: boolean
  ) => Promise<void>;
  fetchMultipleScoreSheets: (teamIds: number[], judgeId: number, sheetType: number) => Promise<void>;
  updateMultipleScores: (scoreSheets: Partial<ScoreSheet>[]) => Promise<void>;
  submitMultipleScoreSheets: (scoreSheets: Partial<ScoreSheet>[]) => Promise<void>;
  fetchMultiTeamPenalties: (judgeId: number, contestId: number, sheetType: number) => Promise<void>;

  // Breakdown and caching operations
  getScoreSheetBreakdown: (teamId: number) => Promise<void>;
  clearScoreBreakdown: () => void;

  // Utility functions
  clearScoreSheet: () => void;
  setScoreSheet: (scoreSheet: ScoreSheet) => void;
}

export const useScoreSheetStore = create<ScoreSheetState>()(
  persist(
    (set, get) => ({
      scoreSheet: null,
      createdScoreSheets: [],
      isLoadingScoreSheet: false,
      scoreSheetError: null,
      scoreSheetBreakdown: null,
      multipleScoreSheets: null,
      scoreSheetBreakdownByTeam: {},
      scoreBreakdownCacheTsByTeam: {},

      clearScoreSheet: async () => {
        try {
          set({ scoreSheet: null });
          set({ scoreSheetError: null });
        } catch (scoreSheetError) {
          set({
            scoreSheetError: "Error clearing out score sheet in state",
          });
          throw new Error("Error clearing out score sheet in state");
        }
      },

      clearScoreBreakdown: async () => {
        try {
          set({ scoreSheetBreakdown: null });
          set({ scoreSheetError: null });
        } catch (scoreSheetError) {
          set({
            scoreSheetError:
              "Error clearing out score sheet breakdown in state",
          });
          throw new Error("Error clearing out score sheet breakdown in state");
        }
      },

      // Direct method to set scoresheet data (for optimized loading)
      setScoreSheet: (scoreSheet: ScoreSheet) => {
        set({ scoreSheet, scoreSheetError: null });
      },

      // Optimized submission method - no loading state for instant response
      submitScoreSheet: async (data: Partial<ScoreSheet>) => {
        try {
          const response = await api.post(`/api/scoreSheet/edit/`, data, { timeout: 20000 });
          
          set({ scoreSheet: response.data.edit_score_sheets });
          set({ scoreSheetError: null });
          
          // Show success toast based on sheet type
          const sheetTypeNames = {
            1: "Presentation",
            2: "Journal", 
            3: "Machine Design",
            4: "Run Penalties",
            5: "Other Penalties",
            6: "Redesign",
            7: "Championship"
          };
          
          const sheetTypeName = sheetTypeNames[data.sheetType as keyof typeof sheetTypeNames] || "Score Sheet";
          toast.success(`${sheetTypeName} scoresheet submitted successfully!`);
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to submit score sheet" });
          toast.error("Failed to submit scoresheet. Please try again.");
          throw new Error("Failed to submit score sheet");
        }
      },

      // Fetch a score sheet by ID
      fetchScoreSheetById: async (scoresId: number) => {
        set({ isLoadingScoreSheet: true });
        try {
          const response = await api.get(`/api/scoreSheet/get/${scoresId}/`);
          set({ scoreSheet: response.data.ScoreSheet });
          set({ scoreSheetError: null });
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to fetch score sheet" });
          throw new Error("Failed to fetch score sheet");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      getScoreSheetBreakdown: async (teamId: number) => {
        const now = Date.now();
        const cache = get().scoreSheetBreakdownByTeam || {};
        const cacheTs = get().scoreBreakdownCacheTsByTeam || {};
        const cached = cache[teamId];
        const cachedTs = cacheTs[teamId] || 0;
        const FRESH_MS = 30_000; // consider fresh for 30s

        // If we have fresh cache, use it immediately with no spinner
        if (cached && (now - cachedTs) < FRESH_MS) {
          set({ scoreSheetBreakdown: cached, scoreSheetError: null });
          return;
        }

        // If we have stale cache, show it immediately and refresh in background
        if (cached) {
          set({ scoreSheetBreakdown: cached, scoreSheetError: null });
        } else {
          set({ isLoadingScoreSheet: true });
        }

        try {
          const response = await api.get(`/api/scoreSheet/getDetails/${teamId}/`);
          const data = response.data as ScoreSheetDetails;
          set((state) => ({
            scoreSheetBreakdown: data,
            scoreSheetError: null,
            scoreSheetBreakdownByTeam: { ...(state.scoreSheetBreakdownByTeam || {}), [teamId]: data },
            scoreBreakdownCacheTsByTeam: { ...(state.scoreBreakdownCacheTsByTeam || {}), [teamId]: now },
          }));
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to fetch score sheet breakdown" });
          throw new Error("Failed to fetch score sheet breakdown");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // Create a new score sheet
      createScoreSheet: async (data: Partial<ScoreSheet>) => {
        set({ isLoadingScoreSheet: true });
        try {
          const response = await api.post(`/api/scoreSheet/create/`, data);
          set({ scoreSheet: response.data });
          set({ scoreSheetError: null });
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to create score sheet" });
          throw new Error("Failed to create score sheet");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // Edit a score sheet by providing new data
      editScoreSheet: async (data: Partial<ScoreSheet>) => {
        set({ isLoadingScoreSheet: true });
        try {
          const response = await api.post(`/api/scoreSheet/edit/`, data);
          set({ scoreSheet: response.data.edit_score_sheets });
          set({ scoreSheetError: null });
          
          // Show success toast based on sheet type
          const sheetTypeNames = {
            1: "Presentation",
            2: "Journal", 
            3: "Machine Design",
            4: "Run Penalties",
            5: "Other Penalties",
            6: "Redesign",
            7: "Championship"
          };
          
          const sheetTypeName = sheetTypeNames[data.sheetType as keyof typeof sheetTypeNames] || "Score Sheet";
          
          if (data.isSubmitted) {
            toast.success(`${sheetTypeName} scoresheet submitted successfully!`);
          } else {
            toast.success(`${sheetTypeName} scoresheet saved successfully!`);
          }
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to edit score sheet" });
          toast.error("Failed to save scoresheet. Please try again.");
          throw new Error("Failed to edit score sheet");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // Update scores in the score sheet
      updateScores: async (data: Partial<ScoreSheet>) => {
        // Removed: set({ isLoadingScoreSheet: true });
        try {
          const response = await api.post(
            `/api/scoreSheet/edit/updateScores/`,
            data
          );
          set({ scoreSheet: response.data.updated_sheet });
          set({ scoreSheetError: null });

          // Show success toast for draft save
          toast.success("Scoresheet saved as draft!");
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to update score sheet" });
          toast.error("Failed to save scoresheet. Please try again.");
          throw new Error("Failed to update score sheet");
        }
        // Removed: set({ isLoadingScoreSheet: false });
      },

      // Edit a specific field in the score sheet
      editScoreSheetField: async (
        id: number,
        field: string | number,
        newValue: any
      ) => {
        set({ isLoadingScoreSheet: true });
        try {
          const response = await api.post(
            `/api/scoreSheet/edit/editField/`,
            { id, field, new_value: newValue }
          );
          set({ scoreSheet: response.data.score_sheet });
          set({ scoreSheetError: null });
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to edit score sheet field" });
          throw new Error("Failed to edit score sheet field");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // Delete a score sheet by ID
      deleteScoreSheet: async (scoresId: number) => {
        set({ isLoadingScoreSheet: true });
        try {
          await api.delete(`/api/scoreSheet/delete/${scoresId}/`);
          set({ scoreSheet: null });
        } catch (scoreSheetError: any) {
          set({ scoreSheetError: "Failed to delete score sheet" });
          throw new Error("Failed to delete score sheet");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // Create score sheets for all teams in a cluster
      createSheetsForTeamsInCluster: async (
        judgeId: number,
        clusterId: number,
        penalties: boolean,
        presentation: boolean,
        journal: boolean,
        mdo: boolean
      ) => {
        set({ isLoadingScoreSheet: true });
        try {
          await api.post(
            `/api/scoreSheet/createForCluster/`,
            { judgeId, clusterId, penalties, presentation, journal, mdo }
          );
          set({ scoreSheetError: null });
        } catch (scoreSheetError: any) {
          set({
            scoreSheetError:
              "Failed to create score sheets for teams in cluster",
          });
          throw new Error("Failed to create score sheets for teams in cluster");
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      // New methods for multiple score sheets
      // Fetch score sheets for multiple teams
      fetchMultipleScoreSheets: async (teamIds: number[], judgeId: number, sheetType: number) => {
        set({ isLoadingScoreSheet: true });
        try {
          // First get the score sheet IDs for each team
          const sheetsPromises = teamIds.map(async (teamId) => {
            try {
              // Fetch score sheet data
              const mapResponse = await api.get(`/api/mapping/scoreSheet/getByTeamJudge/${sheetType}/${judgeId}/${teamId}/`);
          
              const scoreSheetId = mapResponse.data.ScoreSheet?.id;

          
              if (scoreSheetId) {
                const sheetResponse = await api.get(`/api/scoreSheet/get/${scoreSheetId}/`);
          
                return {
                  ...sheetResponse.data.ScoreSheet,
                  teamId,
                  judgeId,
                  sheetType,
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching score sheet for team ${teamId}:`, error);
              return null;
            }
          });
          
          const results = await Promise.all(sheetsPromises);
          
          const validSheets = results.filter((sheet): sheet is ScoreSheet => sheet !== null);
          set({ 
            multipleScoreSheets: validSheets,
            scoreSheetError: null 
          });
        } catch (error) {
          set({ scoreSheetError: "Failed to fetch multiple score sheets" });
          console.error("Failed to fetch multiple score sheets:", error);
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },
      
      // Update scores for multiple score sheets - optimized for instant updates
      updateMultipleScores: async (scoreSheets: Partial<ScoreSheet>[]) => {
        // Optimistically update local state first for instant UI feedback
        const currentSheets = get().multipleScoreSheets;
        if (currentSheets) {
          const updatedSheets = currentSheets.map(sheet => {
            const update = scoreSheets.find(s => s.id === sheet.id);
            if (update) {
              return { ...sheet, ...update };
            }
            return sheet;
          });
          set({ multipleScoreSheets: updatedSheets });
        }
        
        // Then update in background (non-blocking)
        try {
          const updatePromises = scoreSheets.map(sheet => 
            api.post(`/api/scoreSheet/edit/updateScores/`, sheet)
          );
          
          await Promise.all(updatePromises);
          
          // Refresh the data to ensure consistency
          if (currentSheets && currentSheets.length > 0) {
            const teamIds = currentSheets.map(sheet => sheet.teamId).filter((id): id is number => id !== undefined);
            const sampleSheet = currentSheets[0];
            
            if (teamIds.length > 0 && sampleSheet?.judgeId && sampleSheet?.sheetType) {
              // Refresh in background without blocking
              get().fetchMultipleScoreSheets(teamIds, sampleSheet.judgeId, sampleSheet.sheetType).catch(() => {
                // Silently fail - optimistic update already shown
              });
            }
          }
          
          set({ scoreSheetError: null });
        } catch (error) {
          // Revert optimistic update on error
          if (currentSheets) {
            set({ multipleScoreSheets: currentSheets });
          }
          set({ scoreSheetError: "Failed to update multiple score sheets" });
          console.error("Failed to update multiple score sheets:", error);
          throw error;
        }
      },
      
      // Submit multiple score sheets (mark as submitted) - optimized for instant updates
      submitMultipleScoreSheets: async (scoreSheets: Partial<ScoreSheet>[]) => {
        // Optimistically update local state first for instant UI feedback
        const currentSheets = get().multipleScoreSheets;
        if (currentSheets) {
          const updatedSheets = currentSheets.map(sheet => {
            const update = scoreSheets.find(s => s.id === sheet.id);
            if (update) {
              return { ...sheet, ...update, isSubmitted: true };
            }
            return sheet;
          });
          set({ multipleScoreSheets: updatedSheets });
        }
        
        set({ isLoadingScoreSheet: true });
        try {
          const submitPromises = scoreSheets.map(sheet => 
            api.post(`/api/scoreSheet/edit/`, {
              ...sheet,
              isSubmitted: true
            })
          );
          
          await Promise.all(submitPromises);
          set({ scoreSheetError: null });
          
          // Show success toast for multiple submissions
          toast.success(`${scoreSheets.length} scoresheets submitted successfully!`);
        } catch (error) {
          set({ scoreSheetError: "Failed to submit multiple score sheets" });
          toast.error("Failed to submit scoresheets. Please try again.");
          console.error("Failed to submit multiple score sheets:", error);
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      },

      fetchMultiTeamPenalties: async (judgeId: number, contestId: number, sheetType: number) => {
        set({ isLoadingScoreSheet: true });
        try {
          // Choose the right endpoint based on sheet type
          const endpoint = sheetType === 4 
            ? `/api/scoreSheet/multiTeamRunPenalties/${judgeId}/${contestId}/`
            : `/api/scoreSheet/multiTeamGeneralPenalties/${judgeId}/${contestId}/`;
          
          const response = await api.get(endpoint);

          if (response.data && response.data.teams) {
            const sheets = response.data.teams.map((team: any) => ({
              ...team.scoresheet,
              teamId: team.team_id,
              teamName: team.team_name,
            }));
            set({ multipleScoreSheets: sheets, scoreSheetError: null });
          }
        } catch (error) {
          console.error("Failed to fetch multi-team penalties:", error);
          set({ scoreSheetError: "Failed to load penalty sheets" });
        } finally {
          set({ isLoadingScoreSheet: false });
        }
      }
    }),

    
    {
      name: "score-sheet-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )


);