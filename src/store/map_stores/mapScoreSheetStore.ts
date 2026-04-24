import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../../lib/api";
import {
  Contest,
  ScoreSheet,
  ScoreSheetMapping,
  ScoreSheetMappingWithSheet,
} from "../../types";

interface MapScoreSheetState {
  scoreSheetId: number | null;
  allSubmittedForContests: Record<number, boolean | null>;
  isLoadingMapScoreSheet: boolean;
  mapScoreSheetError: string | null;
  mappings: Record<
    string,
    { scoresheet: ScoreSheet | null; total: number | null }
  >;
  fetchScoreSheetId: (
    judgeId: number,
    teamId: number,
    sheetType: number
  ) => Promise<void>;
  fetchScoreSheetWithData: (
    judgeId: number,
    teamId: number,
    sheetType: number
  ) => Promise<ScoreSheet>;
  createScoreSheetMapping: (
    mapping: Partial<ScoreSheetMapping>
  ) => Promise<number | null>;
  deleteScoreSheetMapping: (mapId: number) => Promise<void>;
  fetchScoreSheetsByJudge: (judgeId: number) => Promise<void>;
  fetchScoreSheetsByJudgeAndCluster: (judgeId: number, clusterId: number) => Promise<void>;
  allSheetsSubmittedForContests: (contests: Contest[]) => Promise<void>;
  clearMappings: () => void;
  submitAllPenalties: (judgeId: number) => Promise<void>;
  clearAllSubmittedForContests: () => void;
  clearMapScoreSheetError: () => void;
}

export const useMapScoreSheetStore = create<MapScoreSheetState>()(
  persist(
    (set) => ({
      scoreSheetId: null,
      isLoadingMapScoreSheet: false,
      mapScoreSheetError: null,
      mappings: {},
      allSubmittedForContests: {},

      clearMapScoreSheetError: async () => {
        set({ mapScoreSheetError: null });
      },

      clearScoreSheetId: async () => {
        try {
          set({ scoreSheetId: null });
          set({ mapScoreSheetError: null });
        } catch (error) {
          const errorMessage = "Error clearing out score sheet id in state";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      clearAllSubmittedForContests: () => {
        try {
          set({ allSubmittedForContests: {} });
          set({ mapScoreSheetError: null });
        } catch (error) {
          const errorMessage = "Error clearing out all submitted in state";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      clearMappings: () => {
        set({ mappings: {} });
      },


      fetchScoreSheetsByJudge: async (judgeId: number) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.get(
            `/api/mapping/scoreSheet/getSheetsByJudge/${judgeId}/`
          );

          const fetchedMappings: Record<
            string,
            { scoresheet: ScoreSheet | null; total: number | null }
          > = {};
          response.data.ScoreSheets.forEach(
            (item: ScoreSheetMappingWithSheet) => {
              const key = `${item.mapping.teamid}-${item.mapping.judgeid}-${item.mapping.sheetType}`;
              fetchedMappings[key] = {
                scoresheet: item.scoresheet,
                total: item.total,
              };
            }
          );
          set({ mappings: fetchedMappings });
          set({ mapScoreSheetError: null });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to fetch score sheets by judge";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      fetchScoreSheetsByJudgeAndCluster: async (judgeId: number, clusterId: number) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.get(
            `/api/mapping/scoreSheet/getSheetsByJudgeAndCluster/${judgeId}/${clusterId}/`
          );

          const fetchedMappings: Record<
            string,
            { scoresheet: ScoreSheet | null; total: number | null }
          > = {};
          response.data.ScoreSheets.forEach(
            (item: ScoreSheetMappingWithSheet) => {
              const key = `${item.mapping.teamid}-${item.mapping.judgeid}-${item.mapping.sheetType}`;
              fetchedMappings[key] = {
                scoresheet: item.scoresheet,
                total: item.total,
              };
            }
          );
          set({ mappings: fetchedMappings });
          set({ mapScoreSheetError: null });
        } catch (error) {
          const errorMessage = "Failed to fetch score sheets by judge and cluster";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      fetchScoreSheetId: async (
        judgeId: number,
        teamId: number,
        sheetType: number
      ) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.get(
            `/api/mapping/scoreSheet/getByTeamJudge/${sheetType}/${judgeId}/${teamId}/`
          );
          const fetchedScoreSheetId = response.data.ScoreSheet.id;
          set({ scoreSheetId: fetchedScoreSheetId });
          set({ mapScoreSheetError: null });
        } catch (error) {
          const errorMessage = "Failed to fetch score sheet ID";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      // Optimized method that fetches both mapping and scoresheet data in one call
      fetchScoreSheetWithData: async (
        judgeId: number,
        teamId: number,
        sheetType: number
      ) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.get(
            `/api/mapping/scoreSheet/getByTeamJudge/${sheetType}/${judgeId}/${teamId}/`
          );
          const fetchedScoreSheetId = response.data.ScoreSheet.id;
          set({ scoreSheetId: fetchedScoreSheetId });
          set({ mapScoreSheetError: null });
          
          // Return the scoresheet data directly to avoid second API call
          return response.data.ScoreSheet;
        } catch (error) {
          const errorMessage = "Failed to fetch score sheet data";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      allSheetsSubmittedForContests: async (contests: Contest[]) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.post(
            `/api/mapping/scoreSheet/allSheetsSubmittedForContests/`,
            contests
          );

          const submissionStatus = response.data;
          set({ mapScoreSheetError: null });
          set({ allSubmittedForContests: submissionStatus });
        } catch (error) {
          const errorMessage = "Failed to submit contests";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      // Create new score sheet mapping and return the scoresheet id
      createScoreSheetMapping: async (mapping: Partial<ScoreSheetMapping>) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          const response = await api.post(
            `/api/scoreSheet/mapping/create/`,
            mapping
          );
          const newScoreSheetId = response.data.scoresheetid;
          set({ scoreSheetId: newScoreSheetId });
          set({ mapScoreSheetError: null });
          return newScoreSheetId;
        } catch (error) {
          const errorMessage = "Failed to create score sheet mapping";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      // Delete score sheet mapping by ID
      deleteScoreSheetMapping: async (mapId: number) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          await api.delete(`/api/scoreSheet/mapping/delete/${mapId}/`);
          set({ scoreSheetId: null });
          set({ mapScoreSheetError: null });
        } catch (error) {
          const errorMessage = "Failed to delete score sheet mapping";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },

      submitAllPenalties: async (judgeId: number) => {
        set({ isLoadingMapScoreSheet: true });
        try {
          await api.post(
            `/api/mapping/scoreSheet/submitAllPenalties/`,
            { judge_id: judgeId }
          );
        } catch (error) {
          const errorMessage = "Failed to submit all penalties";
          set({ mapScoreSheetError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapScoreSheet: false });
        }
      },
    }),
    {
      name: "map-score-sheet-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useMapScoreSheetStore;
