import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../../lib/api";
import { Cluster } from "../../types";

interface MapClusterContestState {
  clusters: Cluster[];
  contestClusters: {[contestId: number]: Cluster[]};
  isLoadingMapClusterContest: boolean;
  mapClusterContestError: string | null;
  fetchClustersByContestId: (contestId: number, forceRefresh?: boolean) => Promise<void>;
  addClusterToContest: (contestId: number, cluster: Cluster) => void;
  updateClusterInContest: (contestId: number, updatedCluster: Cluster) => void;
  removeClusterFromContest: (contestId: number, clusterId: number) => void;
  removeContestFromClusters: (contestId: number) => void;
  clearClusters: () => void;
  clearContestClusters: () => Promise<void>;
  fetchClustersForMultipleContests: (contestIds: number[]) => Promise<void>;
}

export const useMapClusterToContestStore = create<MapClusterContestState>()(
  persist(
    (set, get) => ({
      clusters: [],
      contestClusters: {},
      isLoadingMapClusterContest: false,
      mapClusterContestError: null,

      clearClusters: async () => {
        try {
          set({ clusters: [] });
          set({ mapClusterContestError: null });
        } catch (mapClusterContestError) {
          const errorMessage = "Error clearing out clusters in state";
          set({ mapClusterContestError: errorMessage });
          throw Error(errorMessage);
        }
      },

      fetchClustersByContestId: async (contestId: number, forceRefresh = false) => {
        // Check cache first - if we already have clusters for this contest, return early
        const cachedClusters = get().contestClusters[contestId];
        if (!forceRefresh && cachedClusters && cachedClusters.length > 0) {
          set({ clusters: cachedClusters, mapClusterContestError: null });
          return cachedClusters; // Use cached data
        }
        
        set({ isLoadingMapClusterContest: true });
        try {
          const response = await api.get(
            `/api/mapping/clusterToContest/getAllClustersByContest/${contestId}/`,
            { timeout: 20000 }
          );
          // Ensure cluster_type is present and normalized
          const clusters = (response.data.Clusters || []).map((c: any) => ({
            ...c,
            cluster_type: (c.cluster_type ?? "preliminary").toLowerCase(),
          }));
          set({ 
            clusters,
            contestClusters: {
              ...get().contestClusters,
              [contestId]: clusters,
            }
          });
          set({ mapClusterContestError: null });
          return clusters; // Return the clusters for immediate use
        } catch (mapClusterContestError: any) {
          const errorMessage = "Failed to fetch clusters";
          set({ mapClusterContestError: errorMessage });
          throw Error(errorMessage);
        } finally {
          set({ isLoadingMapClusterContest: false });
        }
      },

      addClusterToContest: (contestId: number, cluster: Cluster) => {
        const state = get();
        const normalizedCluster: Cluster = {
          ...cluster,
          cluster_type: (cluster.cluster_type ?? "preliminary").toLowerCase() as any,
        };
        const existingClusters = state.contestClusters[contestId] || [];
        
        set({
          clusters: [...state.clusters, normalizedCluster],
          contestClusters: {
            ...state.contestClusters,
            [contestId]: [...existingClusters, normalizedCluster],
          },
        });
      },

      updateClusterInContest: (contestId: number, updatedCluster: Cluster) => {
        const state = get();
        const normalizedCluster: Cluster = {
          ...updatedCluster,
          cluster_type: (updatedCluster.cluster_type ?? "preliminary").toLowerCase() as any,
        };
        
        set({
          clusters: state.clusters.map((c) =>
            c.id === normalizedCluster.id ? normalizedCluster : c
          ),
          contestClusters: {
            ...state.contestClusters,
            [contestId]: (state.contestClusters[contestId] || []).map((c) =>
              c.id === normalizedCluster.id ? normalizedCluster : c
            ),
          },
        });
      },

      removeClusterFromContest: (contestId: number, clusterId: number) => {
        const state = get();
        set({
          clusters: state.clusters.filter((c) => c.id !== clusterId),
          contestClusters: {
            ...state.contestClusters,
            [contestId]: (state.contestClusters[contestId] || []).filter((c) => c.id !== clusterId),
          },
        });
      },

      removeContestFromClusters: (contestId: number) => {
        set((state) => {
          const updatedContestClusters = { ...state.contestClusters };
          delete updatedContestClusters[contestId];

          // Remove clusters that belonged only to this contest
          const clustersToKeep = state.clusters.filter(cluster => {
            // Keep clusters that exist in other contests
            return Object.keys(updatedContestClusters).some(contestIdKey => {
              const cid = parseInt(contestIdKey);
              return cid !== contestId && updatedContestClusters[cid]?.some(c => c.id === cluster.id);
            });
          });

          return {
            contestClusters: updatedContestClusters,
            clusters: clustersToKeep,
          };
        });
      },

      clearContestClusters: async () => {
        try {
          set({ contestClusters: {} });
          set({ mapClusterContestError: null });
        } catch (error) {
          const errorMessage = "Error clearing contest clusters";
          set({ mapClusterContestError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      fetchClustersForMultipleContests: async (contestIds: number[]) => {
        // Check cache first - only fetch for contests we don't have data for
        const cachedContestClusters = get().contestClusters;
        const contestClustersMap: {[contestId: number]: Cluster[]} = { ...cachedContestClusters };
        const contestsToFetch = contestIds.filter(id => !cachedContestClusters[id] || cachedContestClusters[id].length === 0);
        
        // If all contests are cached, return early
        if (contestsToFetch.length === 0) {
          return; // Use cached data
        }
        
        set({ isLoadingMapClusterContest: true });
        try {
          for (const contestId of contestsToFetch) {
            try {
              const response = await api.get(
                `/api/mapping/clusterToContest/getAllClustersByContest/${contestId}/`
              );
              contestClustersMap[contestId] = response.data.Clusters || [];
            } catch (error) {
              console.warn(`Failed to fetch clusters for contest ${contestId}`);
              contestClustersMap[contestId] = [];
            }
          }
          
          set({ 
            contestClusters: contestClustersMap,
            mapClusterContestError: null,
            isLoadingMapClusterContest: false,
          });
        } catch (error) {
          const errorMessage = "Error fetching clusters for multiple contests";
          set({ 
            mapClusterContestError: errorMessage,
            isLoadingMapClusterContest: false,
          });
          throw new Error(errorMessage);
        }
      },
    }),
    {
      name: "map-cluster-contest-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
