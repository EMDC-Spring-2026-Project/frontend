import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../../lib/api";
import { Contest, Judge, MapContestToJudge } from "../../types";

interface MapContestJudgeState {
  judges: Judge[];
  contest: Contest | null;
  judgeContests: Contest[];
  mappings: MapContestToJudge[];
  contestJudges: {[contestId: number]: Judge[]};
  isLoadingMapContestJudge: boolean;
  mapContestJudgeError: string | null;

  createContestJudgeMapping: (mapData: MapContestToJudge) => Promise<void>;
  getAllJudgesByContestId: (contestId: number, forceRefresh?: boolean) => Promise<void>;
  addJudgeToContest: (contestId: number, judge: Judge) => void;
  updateJudgeInContest: (contestId: number, updatedJudge: Judge) => void;
  removeJudgeFromContest: (judgeId: number, contestId: number) => Promise<void>;
  removeContestFromJudges: (contestId: number) => void;
  getContestByJudgeId: (judgeId: number, forceRefresh?: boolean) => Promise<void>;
  getContestsByJudgeId: (judgeId: number) => Promise<void>;
  deleteContestJudgeMappingById: (mapId: number) => Promise<void>;
  clearJudges: () => void;
  clearContest: () => void;
  clearMappings: () => void;
  clearContestJudges: () => Promise<void>;
  fetchJudgesForMultipleContests: (contestIds: number[]) => Promise<void>;
  removeJudgeFromContestStoreIfNoOtherClusters: (
    judgeId: number,
    contestId: number
  ) => void;
  updateContestForJudge: (updatedContest: Contest) => void;
}

export const useMapContestJudgeStore = create<MapContestJudgeState>()(
  persist(
    (set, get) => ({
      judges: [],
      contest: null,
      judgeContests: [],
      mappings: [],
      contestJudges: {},
      isLoadingMapContestJudge: false,
      mapContestJudgeError: null,

      clearJudges: async () => {
        try {
          set({ judges: [] });
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error clearing out judges in state";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      clearContest: async () => {
        try {
          set({ contest: null, judgeContests: [] });
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error clearing out contest in state";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      clearMappings: async () => {
        try {
          set({ mappings: [] });
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error clearing out mappings in state";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      createContestJudgeMapping: async (mapData: MapContestToJudge) => {
        set({ isLoadingMapContestJudge: true });
        try {
          const response = await api.post(
            `/api/mapping/contestToJudge/create/`,
            mapData
          );
          set((state) => ({
            mappings: [...state.mappings, response.data],
          }));
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error creating contest-judge mapping";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapContestJudge: false });
        }
      },

      getAllJudgesByContestId: async (contestId: number, forceRefresh: boolean = false) => {
        // Check cache first - if we already have judges for this contest and not forcing refresh, return early
        if (!forceRefresh) {
          const cachedJudges = get().contestJudges[contestId];
          if (cachedJudges && cachedJudges.length > 0) {
            set({ judges: cachedJudges });
            return; // Use cached data
          }
        }
        
        set({ isLoadingMapContestJudge: true });
        try {
          const response = await api.get(
            `/api/mapping/judgeToContest/getAllJudges/${contestId}/`
          );
          // Update judges and contestJudges map
          const judges = response.data.Judges || [];
          set({
            judges: judges,
            contestJudges: {
              ...get().contestJudges,
              [contestId]: judges,
            },
            mapContestJudgeError: null,
            isLoadingMapContestJudge: false,
          });
        } catch (error) {
          const errorMessage = "Error fetching judges by contest ID";
          set({ 
            mapContestJudgeError: errorMessage,
            isLoadingMapContestJudge: false,
          });
          throw new Error(errorMessage);
        }
      },

      getContestByJudgeId: async (judgeId: number, forceRefresh: boolean = false) => {
        // Check cache first - if we already have this contest and not forcing refresh, return early
        if (!forceRefresh) {
          const cachedContest = get().contest;
          if (cachedContest) {
            return; // Use cached data
          }
        }
        
        set({ isLoadingMapContestJudge: true });
        try {
          const response = await api.get(
            `/api/mapping/contestToJudge/getContestByJudge/${judgeId}/`
          );
          set({
            contest: response.data.Contest,
          });
          set({ mapContestJudgeError: null });
        } catch (error: any) {
          console.error('Error fetching contest by judge ID:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Error fetching contest by judge ID";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapContestJudge: false });
        }
      },

      getContestsByJudgeId: async (judgeId: number) => {
        set({ isLoadingMapContestJudge: true });
        try {
          const response = await api.get(
            `/api/mapping/contestToJudge/judge-contests/${judgeId}/`
          );
          const judgeContests: Contest[] = response.data?.contests || [];
          set({
            judgeContests,
            // Keep the older single-contest field in sync for any existing consumers.
            contest: judgeContests[0] || null,
            mapContestJudgeError: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Error fetching contests for judge";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapContestJudge: false });
        }
      },

      addJudgeToContest: (contestId: number, judge: Judge) => {
        const state = get();
        const existingJudges = state.contestJudges[contestId] || [];
        
        set({
          judges: [...state.judges, judge],
          contestJudges: {
            ...state.contestJudges,
            [contestId]: [...existingJudges, judge],
          },
        });
      },

      updateJudgeInContest: (contestId: number, updatedJudge: Judge) => {
        const state = get();
        set({
          judges: state.judges.map((j) =>
            j.id === updatedJudge.id ? updatedJudge : j
          ),
          contestJudges: {
            ...state.contestJudges,
            [contestId]: (state.contestJudges[contestId] || []).map((j) =>
              j.id === updatedJudge.id ? updatedJudge : j
            ),
          },
        });
      },

      deleteContestJudgeMappingById: async (mapId: number) => {
        set({ isLoadingMapContestJudge: true });
        try {
          await api.delete(`/api/mapping/contestToJudge/delete/${mapId}/`);
          set((state) => ({
            mappings: state.mappings.filter((mapping) => mapping.id !== mapId),
          }));
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error deleting contest-judge mapping";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapContestJudge: false });
        }
      },

      removeJudgeFromContest: async (judgeId: number, contestId: number) => {
        set({ isLoadingMapContestJudge: true });
        
        // Store original state for rollback on error
        const originalState = get().contestJudges[contestId] || [];
        const originalJudges = get().judges;
        
        //  remove from local state immediately
        set((state) => ({
          judges: state.judges.filter((j) => j.id !== judgeId),
          contestJudges: {
            ...state.contestJudges,
            [contestId]: (state.contestJudges[contestId] || []).filter(
              (j) => j.id !== judgeId
            ),
          },
          mapContestJudgeError: null,
        }));
        
        try {
          await api.delete(`/api/mapping/contestToJudge/remove/${judgeId}/${contestId}/`);
          // Success:  no refresh needed
          set({ mapContestJudgeError: null });
        } catch (error) {
          // On error: rollback optimistic update and refresh
          set((state) => ({
            judges: originalJudges,
            contestJudges: {
              ...state.contestJudges,
              [contestId]: originalState,
            },
          }));
          await get().getAllJudgesByContestId(contestId, true);
          const errorMessage = "Error removing judge from contest";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          set({ isLoadingMapContestJudge: false });
        }
      },

      removeJudgeFromContestStoreIfNoOtherClusters: (
        judgeId: number,
        contestId: number
      ) => {
        // Remove judge from contest's judge list
        set((state) => ({
          judges: state.judges.filter((j) => j.id !== judgeId),
          contestJudges: {
            ...state.contestJudges,
            [contestId]: (state.contestJudges[contestId] || []).filter(
              (j) => j.id !== judgeId
            ),
          },
        }));
      },

      updateContestForJudge: (updatedContest: Contest) => {
        // Update the cached contest if it matches the updated contest
        set((state) => ({
          contest: state.contest && state.contest.id === updatedContest.id ? updatedContest : state.contest,
          judgeContests: state.judgeContests.map((judgeContest) =>
            judgeContest.id === updatedContest.id ? updatedContest : judgeContest
          ),
        }));
      },

      removeContestFromJudges: (contestId: number) => {
        set((state) => {
          const updatedContestJudges = { ...state.contestJudges };
          delete updatedContestJudges[contestId];

          // Clear current contest if it matches
          const judgeContests = state.judgeContests.filter(
            (judgeContest) => judgeContest.id !== contestId
          );
          const updatedContest = state.contest && state.contest.id === contestId
            ? judgeContests[0] || null
            : state.contest;

          return {
            contestJudges: updatedContestJudges,
            contest: updatedContest,
            judgeContests,
          };
        });
      },

      clearContestJudges: async () => {
        try {
          set({ contestJudges: {} });
          set({ mapContestJudgeError: null });
        } catch (error) {
          const errorMessage = "Error clearing contest judges";
          set({ mapContestJudgeError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      fetchJudgesForMultipleContests: async (contestIds: number[]) => {
        // Check cache first - only fetch for contests we don't have data for
        const cachedContestJudges = get().contestJudges;
        const contestJudgesMap: {[contestId: number]: Judge[]} = { ...cachedContestJudges };
        const contestsToFetch = contestIds.filter(id => !(id in cachedContestJudges));
        
        // If all contests are cached, return early
        if (contestsToFetch.length === 0) {
          return; // Use cached data
        }
        
        set({ isLoadingMapContestJudge: true });
        try {
          for (const contestId of contestsToFetch) {
            try {
              const response = await api.get(
                `/api/mapping/judgeToContest/getAllJudges/${contestId}/`
              );
              contestJudgesMap[contestId] = response.data.Judges || [];
            } catch (error) {
              console.warn(`Failed to fetch judges for contest ${contestId}`);
              contestJudgesMap[contestId] = [];
            }
          }
          
          set({ 
            contestJudges: contestJudgesMap,
            mapContestJudgeError: null,
            isLoadingMapContestJudge: false,
          });
        } catch (error) {
          const errorMessage = "Error fetching judges for multiple contests";
          set({ 
            mapContestJudgeError: errorMessage,
            isLoadingMapContestJudge: false,
          });
          throw new Error(errorMessage);
        }
      },
    }),
    {
      name: "map-contest-judge-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useMapContestJudgeStore;
