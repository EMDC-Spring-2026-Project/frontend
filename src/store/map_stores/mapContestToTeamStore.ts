import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../../lib/api";
import { Contest, Team } from "../../types";

const CONTEST_CACHE_TTL_MS = 30_000;
const TEAMS_BY_CONTEST_CACHE_TTL_MS = 30_000;
let teamsByContestRequestSequence = 0;
let activeMappingFetches = 0;

interface MapContestToTeamState {
  contestsForTeams: { [key: number]: Contest | null };
  contestCacheTsByTeam: { [key: number]: number };
  teamsByContest: Team[];
  teamsByContestMap?: { [contestId: number]: Team[] };
  teamsByContestCacheTsByContest: { [contestId: number]: number };
  isLoadingMapContestToTeam: boolean;
  mapContestToTeamError: string | null;
  fetchContestsByTeams: (teamIds: Team[], forceRefresh?: boolean) => Promise<void>;
  fetchTeamsByContest: (contestId: number, forceRefresh?: boolean) => Promise<void>;
  updateContestInTeams: (updatedContest: Contest) => void;
  removeContestFromTeams: (contestId: number) => void;
  clearContests: () => void;
  clearTeamsByContest: () => void;
  setContestsForTeams: (map: { [key: number]: Contest | null }) => void;
}

export const useMapContestToTeamStore = create<MapContestToTeamState>()(
  persist(
    (set, get) => ({
      contestsForTeams: {},
      contestCacheTsByTeam: {},
      isLoadingMapContestToTeam: false,
      mapContestToTeamError: null,
      teamsByContest: [],
      teamsByContestMap: {},
      teamsByContestCacheTsByContest: {},

      clearContests: () => set({ contestsForTeams: {}, contestCacheTsByTeam: {} }),
      clearTeamsByContest: () => {
        teamsByContestRequestSequence += 1;
        set({
          teamsByContest: [],
          teamsByContestMap: {},
          teamsByContestCacheTsByContest: {},
        });
      },

      updateContestInTeams: (updatedContest: Contest) => {
        set((state) => {
          const updatedContestsForTeams = { ...state.contestsForTeams };
          const updatedCacheTimestamps = { ...state.contestCacheTsByTeam };
          // Update contest data for all teams that have this contest
          Object.keys(updatedContestsForTeams).forEach((teamIdStr) => {
            const teamId = parseInt(teamIdStr, 10);
            const contest = updatedContestsForTeams[teamId];
            if (contest && contest.id === updatedContest.id) {
              updatedContestsForTeams[teamId] = updatedContest;
              updatedCacheTimestamps[teamId] = Date.now();
            }
          });
          return {
            contestsForTeams: updatedContestsForTeams,
            contestCacheTsByTeam: updatedCacheTimestamps,
          };
        });
      },

      removeContestFromTeams: (contestId: number) => {
        teamsByContestRequestSequence += 1;
        set((state) => {
          const updatedContestsForTeams = { ...state.contestsForTeams };
          const updatedCacheTimestamps = { ...state.contestCacheTsByTeam };
          const updatedTeamsByContestMap = { ...(state.teamsByContestMap || {}) };
          const updatedTeamsByContestCacheTs = {
            ...state.teamsByContestCacheTsByContest,
          };

          // Remove contest from contestsForTeams for all teams that had this contest
          Object.keys(updatedContestsForTeams).forEach((teamIdStr) => {
            const teamId = parseInt(teamIdStr, 10);
            const contest = updatedContestsForTeams[teamId];
            if (contest && contest.id === contestId) {
              delete updatedContestsForTeams[teamId];
              delete updatedCacheTimestamps[teamId];
            }
          });

          // Remove contest from teamsByContestMap
          delete updatedTeamsByContestMap[contestId];
          delete updatedTeamsByContestCacheTs[contestId];

          // Clear current contest data if it matches
          const updatedTeamsByContest = state.teamsByContestMap?.[contestId] ? [] : state.teamsByContest;

          return {
            contestsForTeams: updatedContestsForTeams,
            contestCacheTsByTeam: updatedCacheTimestamps,
            teamsByContestMap: updatedTeamsByContestMap,
            teamsByContestCacheTsByContest: updatedTeamsByContestCacheTs,
            teamsByContest: updatedTeamsByContest,
          };
        });
      },

      fetchContestsByTeams: async (teams: Team[], forceRefresh: boolean = false) => {
        const currentState = get();
        const now = Date.now();
        const teamsToFetch = forceRefresh
          ? teams
          : teams.filter((team) => {
              const hasCachedValue = Object.prototype.hasOwnProperty.call(
                currentState.contestsForTeams,
                team.id
              );
              const cachedAt = currentState.contestCacheTsByTeam[team.id] || 0;
              return !hasCachedValue || now - cachedAt >= CONTEST_CACHE_TTL_MS;
            });

        if (teamsToFetch.length === 0) {
          return;
        }

        activeMappingFetches += 1;
        set({ isLoadingMapContestToTeam: true });
        try {
          const response = await api.post(
            "/api/mapping/contestToTeam/contestsByTeams/",
            teamsToFetch
          );

          const refreshedContests = Object.fromEntries(
            teamsToFetch.map((team) => [
              team.id,
              Object.prototype.hasOwnProperty.call(response.data, team.id)
                ? response.data[team.id]
                : null,
            ])
          );
          const fetchedAt = Date.now();
          const refreshedTimestamps = Object.fromEntries(
            teamsToFetch.map((team) => [team.id, fetchedAt])
          );

          set((state) => ({
            contestsForTeams: { ...state.contestsForTeams, ...refreshedContests },
            contestCacheTsByTeam: {
              ...state.contestCacheTsByTeam,
              ...refreshedTimestamps,
            },
            mapContestToTeamError: null,
          }));
        } catch (error: any) {
          const errorMessage = "Failed to fetch contests by team IDs";
          set({ mapContestToTeamError: errorMessage });
          throw new Error(errorMessage);
        } finally {
          activeMappingFetches = Math.max(0, activeMappingFetches - 1);
          set({ isLoadingMapContestToTeam: activeMappingFetches > 0 });
        }
      },

      fetchTeamsByContest: async (contestId: number, forceRefresh: boolean = false) => {
        // A newer contest request (or a cache hit) makes older responses stale
        // for the currently displayed list.
        const requestSequence = ++teamsByContestRequestSequence;
        // Keep the fast path for fresh data while allowing assignment changes
        // made by other users to appear after a short cache window.
        const state = get();
        const byContestMap = state.teamsByContestMap || {};
        const hasCachedValue = Object.prototype.hasOwnProperty.call(
          byContestMap,
          contestId
        );
        const cachedAt = state.teamsByContestCacheTsByContest[contestId] || 0;
        const cacheIsFresh = Date.now() - cachedAt < TEAMS_BY_CONTEST_CACHE_TTL_MS;
        if (!forceRefresh && hasCachedValue && cacheIsFresh) {
          set({ teamsByContest: byContestMap[contestId], mapContestToTeamError: null });
          return;
        }

        activeMappingFetches += 1;
        set({ isLoadingMapContestToTeam: true });
        try {
          const response = await api.get(
            `/api/mapping/teamToContest/getTeamsByContest/${contestId}/`,
            { timeout: 20000 }
          );

          const fetchedAt = Date.now();
          set((state) => {
            if (requestSequence !== teamsByContestRequestSequence) {
              return state;
            }
            return {
            teamsByContest: response.data,
            teamsByContestMap: { ...(state.teamsByContestMap || {}), [contestId]: response.data },
            teamsByContestCacheTsByContest: {
              ...state.teamsByContestCacheTsByContest,
              [contestId]: fetchedAt,
            },
            mapContestToTeamError: null,
            };
          });
        } catch (error: any) {
          const errorMessage = "Failed to fetch teams by contest id";
          if (requestSequence === teamsByContestRequestSequence) {
            set({ mapContestToTeamError: errorMessage });
          }
          throw new Error(errorMessage);
        } finally {
          activeMappingFetches = Math.max(0, activeMappingFetches - 1);
          set({ isLoadingMapContestToTeam: activeMappingFetches > 0 });
        }
      },

      setContestsForTeams: (map: { [key: number]: Contest | null }) => {
        set((state) => {
          const updatedTimestamps = { ...state.contestCacheTsByTeam };
          const fetchedAt = Date.now();
          Object.keys(map).forEach((teamId) => {
            updatedTimestamps[Number(teamId)] = fetchedAt;
          });

          return {
            contestsForTeams: {
              ...state.contestsForTeams,
              ...map,
            },
            contestCacheTsByTeam: updatedTimestamps,
          };
        });
      },
    }),
    {
      name: "map-contest-to-team-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
    
