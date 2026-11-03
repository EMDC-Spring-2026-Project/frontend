import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../../lib/api";
import { Team, Coach } from "../../types";

interface MapCoachTeamState {
  teams: Team[];
  isLoadingMapCoachToTeam: boolean;
  mapCoachToTeamError: string | null;
  coachesByTeams: Record<number, Coach>;
  createCoachTeamMapping: (data: object) => Promise<void>;
  fetchTeamsByCoachId: (coachId: number) => Promise<void>;
  deleteCoachTeamMapping: (mapId: number) => Promise<void>;
  clearTeams: () => void;
  fetchCoachesByTeams: (data: object) => Promise<void>;
  clearCoachesByTeams: () => void;
  updateCoachByTeamId: (teamId: number, coach: Coach) => void;
  updateCoachForAllTeams: (username: string, coach: Coach) => void;
}

export const useMapCoachToTeamStore = create<MapCoachTeamState>()(
  persist(
    (set, get) => ({
      teams: [],
      coach: null,
      isLoadingMapCoachToTeam: false,
      mapCoachToTeamError: null,
      coachesByTeams: {},

      clearTeams: () => set({ teams: [] }),
      clearCoachesByTeams: () => set({ coachesByTeams: {} }),
      
      updateCoachByTeamId: (teamId: number, coach: Coach) => {
        set((state) => {
          const existingCoach = state.coachesByTeams[teamId];
          // Preserve username from existing coach if new coach doesn't have it
    
          const updatedCoach: Coach = {
            ...coach,
            username: coach.username || existingCoach?.username || "",
          };
          return {
            coachesByTeams: {
              ...state.coachesByTeams,
              [teamId]: updatedCoach,
            },
          };
        });
      },

      updateCoachForAllTeams: (username: string, coach: Coach) => {
        set((state) => {
          const updatedCoachesByTeams: Record<number, Coach> = {};
          let hasChanges = false;
          
          // Update coach for all teams that have this username
          Object.keys(state.coachesByTeams).forEach((teamIdStr) => {
            const teamId = parseInt(teamIdStr);
            const existingCoach = state.coachesByTeams[teamId];
            if (existingCoach && existingCoach.username === username) {
              updatedCoachesByTeams[teamId] = {
                ...coach,
                username: coach.username || existingCoach.username || username,
              };
              hasChanges = true;
            }
          });
          
          // Always return a new state object to ensure Zustand detects the change
          return {
            ...state,
            coachesByTeams: hasChanges
              ? {
                  ...state.coachesByTeams,
                  ...updatedCoachesByTeams,
                }
              : state.coachesByTeams,
          };
        });
      },

      createCoachTeamMapping: async (data: object) => {
        set({ isLoadingMapCoachToTeam: true });
        try {
          await api.post("/api/mapping/coachToTeam/create/", data);
          set({ mapCoachToTeamError: null });
        } catch (mapCoachToTeamError: any) {
          const errorMessage = "Failed to create coach-team mapping";
          set({ mapCoachToTeamError: errorMessage });
          throw Error(errorMessage);
        } finally {
          set({ isLoadingMapCoachToTeam: false });
        }
      },

      fetchCoachesByTeams: async (data: object) => {
        // Check cache first - only fetch coaches for teams we don't have yet
        const teams = Array.isArray(data) ? data : [];
        const teamsToFetch = teams.filter((team: any) => {
          const teamId = team.id || team;
          return !get().coachesByTeams[teamId];
        });
        
        // If we already have all coaches, return early
        if (teamsToFetch.length === 0) {
          return;
        }
        
        set({ isLoadingMapCoachToTeam: true });
        try {
          const batchSize = 100;
          const batches: typeof teamsToFetch[] = [];
          for (let index = 0; index < teamsToFetch.length; index += batchSize) {
            batches.push(teamsToFetch.slice(index, index + batchSize));
          }
          const responses = await Promise.all(
            batches.map((batch) =>
              api.post("/api/mapping/coachToTeam/coachesByTeams/", batch)
            )
          );
          const fetchedCoaches = Object.assign({}, ...responses.map(({ data }) => data));
          set((state) => ({
            coachesByTeams: {
              ...state.coachesByTeams,
              ...fetchedCoaches,
            },
            mapCoachToTeamError: null,
          }));
        } catch (mapCoachToTeamError: any) {
          const errorMessage = "Failed to get coaches by teams mapping";
          set({ mapCoachToTeamError: errorMessage });
          throw Error(errorMessage);
        } finally {
          set({ isLoadingMapCoachToTeam: false });
        }
      },

      fetchTeamsByCoachId: async (coachId: number) => {
        set({ isLoadingMapCoachToTeam: true });
        try {
          const response = await api.get(
            `/api/mapping/coachToTeam/teamsByCoach/${coachId}/`,
            { timeout: 20000 }
          );
          set({ teams: response.data.Teams, mapCoachToTeamError: null });
        } catch (mapCoachToTeamError: any) {
          const errorMessage = "Failed to fetch teams by coach ID";
          set({ mapCoachToTeamError: errorMessage });
          throw Error(errorMessage);
        } finally {
          set({ isLoadingMapCoachToTeam: false });
        }
      },

      deleteCoachTeamMapping: async (mapId: number) => {
        set({ isLoadingMapCoachToTeam: true });
        try {
          await api.delete(`/api/mapping/coachToTeam/delete/${mapId}/`);
          set({ mapCoachToTeamError: null });
        } catch (mapCoachToTeamError: any) {
          const errorMessage = "Failed to delete coach-team mapping";
          set({ mapCoachToTeamError: errorMessage });
          throw Error(errorMessage);
        } finally {
          set({ isLoadingMapCoachToTeam: false });
        }
      },
    }),
    {
      name: "map-coach-team-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
