// ==============================
// Store: Contest Store
// Manages contest data, CRUD operations, and synchronization with related entities.
// Handles contest creation, editing, deletion with automatic data consistency across stores.
// ==============================

// ==============================
// Core Dependencies
// ==============================
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ==============================
// API & Types
// ==============================
import { api } from "../../lib/api";
import { Contest, NewContest } from "../../types";

// ==============================
// Related Store Imports
// ==============================
import useMapContestOrganizerStore from "../map_stores/mapContestToOrganizerStore";
import { useMapContestToTeamStore } from "../map_stores/mapContestToTeamStore";
import useMapContestJudgeStore from "../map_stores/mapContestToJudgeStore";
import { useMapClusterToContestStore } from "../map_stores/mapClusterToContestStore";
import { dispatchDataChange } from "../../utils/dataChangeEvents";

let contestRequestSequence = 0;

// ==============================
// Types & Interfaces
// ==============================

interface ContestState {
  // Contest data
  allContests: Contest[];
  contest: Contest | null;

  // Loading and error states
  isLoadingContest: boolean;
  contestError: string | null;

  // CRUD operations
  fetchAllContests: (forceRefresh?: boolean) => Promise<void>;
  fetchContestById: (contestId: number, forceRefresh?: boolean) => Promise<void>;
  createContest: (newContest: NewContest) => Promise<void>;
  editContest: (editedContest: Contest) => Promise<void>;
  deleteContest: (contestId: number) => Promise<void>;

  // Utility functions
  clearContest: () => void;
}

// ==============================
// Store Implementation
// ==============================

export const useContestStore = create<ContestState>()(
  persist(
    (set, get) => ({
      // ==============================
      // Initial State
      // ==============================
      allContests: [],
      contest: null,
      isLoadingContest: false,
      contestError: null,

      // ==============================
      // Utility Functions
      // ==============================

      clearContest: () => {
        contestRequestSequence += 1;
        set({ contest: null, contestError: null, isLoadingContest: false });
      },

      clearAllContests: () => {
        set({ contest: null, contestError: null });
      },

      // ==============================
      // Data Fetching Actions
      // ==============================

      fetchAllContests: async (forceRefresh: boolean = false) => {
        const cachedContests = get().allContests;
        if (!forceRefresh && cachedContests && cachedContests.length > 0) {
          return;
        }

        set({ isLoadingContest: true });
        try {
          const { data } = await api.get(`/api/contest/getAll/`, { timeout: 20000 });
          set({ allContests: data.Contests });
          set({ contestError: null });
        } catch (contestError) {
          set({ contestError: "Error fetching contests: " + contestError });
          throw Error("Error fetching contests: " + contestError);
        } finally {
          set({ isLoadingContest: false });
        }
      },

      fetchContestById: async (contestId: number, forceRefresh: boolean = false) => {
        const requestSequence = ++contestRequestSequence;
        if (!forceRefresh) {
          const cachedContest = get().contest;
          if (cachedContest && cachedContest.id === contestId) {
            set({ contestError: null, isLoadingContest: false });
            return;
          }

          const cachedInAll = get().allContests.find(c => c.id === contestId);
          if (cachedInAll) {
            set({ contest: cachedInAll, contestError: null, isLoadingContest: false });
            return;
          }
        }

        set({ isLoadingContest: true });
        try {
          const { data } = await api.get(`/api/contest/get/${contestId}/`, { timeout: 20000 });
          if (requestSequence !== contestRequestSequence) return;
          set({
            contest: data.Contest,
            allContests: get().allContests.map((cachedContest) =>
              cachedContest.id === data.Contest.id ? data.Contest : cachedContest
            ),
          });
          set({ contestError: null });
        } catch (contestError) {
          if (requestSequence === contestRequestSequence) {
            set({ contestError: "Error fetching contest: " + contestError });
          }
          throw Error("Error fetching contest: " + contestError);
        } finally {
          if (requestSequence === contestRequestSequence) {
            set({ isLoadingContest: false });
          }
        }
      },

      // ==============================
      // CRUD Operations
      // ==============================

      createContest: async (newContest: NewContest) => {
        set({ isLoadingContest: true });
        try {
          const { data } = await api.post(`/api/contest/create/`, newContest);
          const createdContest: Contest = data.contest;
          set((state) => ({
            allContests: [...state.allContests, createdContest],
            contestError: null,
          }));
        } catch (contestError) {
          set({ contestError: "Error creating contest: " + contestError });
          throw Error("Error creating contest: " + contestError);
        } finally {
          set({ isLoadingContest: false });
        }
      },

      editContest: async (editedContest: Contest) => {
        set({ isLoadingContest: true });
        try {
          const { data } = await api.post(`/api/contest/edit/`, editedContest);
          const updatedContest: Contest = data.Contest;

          set((state) => ({
            allContests: state.allContests.map((c) =>
              c.id === updatedContest.id ? updatedContest : c
            ),
            contest: state.contest && state.contest.id === updatedContest.id ? updatedContest : state.contest,
            contestError: null,
          }));

          // Synchronize changes across related stores
          const { updateContestInMappings } = useMapContestOrganizerStore.getState();
          updateContestInMappings(updatedContest.id, updatedContest);

          const { updateContestInTeams } = useMapContestToTeamStore.getState();
          updateContestInTeams(updatedContest);

          const { updateContestForJudge } = useMapContestJudgeStore.getState();
          updateContestForJudge(updatedContest);
        } catch (contestError) {
          set({ contestError: "Error editing contest: " + contestError });
          throw Error("Error editing contest: " + contestError);
        } finally {
          set({ isLoadingContest: false });
        }
      },

      deleteContest: async (contestId: number) => {
        set({ isLoadingContest: true });
        try {
          await api.delete(`/api/contest/delete/${contestId}/`);
          set((state) => ({
            allContests: state.allContests.filter((c) => c.id !== contestId),
            contest: state.contest && state.contest.id === contestId ? null : state.contest,
            contestError: null,
          }));

          // Clean up related data across all stores
          const { removeContestFromAllOrganizers } = useMapContestOrganizerStore.getState();
          removeContestFromAllOrganizers(contestId);

          const { removeContestFromTeams } = useMapContestToTeamStore.getState();
          removeContestFromTeams(contestId);

          const { removeContestFromJudges } = useMapContestJudgeStore.getState();
          removeContestFromJudges(contestId);

          const { removeContestFromClusters } = useMapClusterToContestStore.getState();
          removeContestFromClusters(contestId);

          dispatchDataChange({ type: 'contest', action: 'delete', id: contestId });
        } catch (contestError) {
          set({ contestError: "Error deleting contest: " + contestError });
          throw Error("Error deleting contest: " + contestError);
        } finally {
          set({ isLoadingContest: false });
        }
      },
    }),
    {
      // ==============================
      // Persistence Configuration
      // ==============================
      name: "contest-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useContestStore;
