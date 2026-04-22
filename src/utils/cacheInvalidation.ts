/**
 * Cache invalidation system for sessionStorage stores
 * Automatically clears stale cache when data changes occur
 */

import { onDataChange, DataChangeEvent } from './dataChangeEvents';

interface CacheInvalidationRule {
  eventType: string;
  eventAction?: string;
  storageKeys: string[];
  condition?: (event: DataChangeEvent) => boolean;
}

// Rules for when to clear specific caches
const CACHE_INVALIDATION_RULES: CacheInvalidationRule[] = [
  // Team changes affect multiple caches
  {
    eventType: 'team',
    storageKeys: [
      'map-contest-to-team-storage',
      'map-cluster-to-team-storage',
      'map-coach-to-team-storage',
      'special-award-storage'
    ]
  },
  // Judge changes affect judge-related caches
  {
    eventType: 'judge',
    storageKeys: [
      'map-cluster-to-judge-storage',
      'map-contest-to-judge-storage',
      'judge-storage'
    ]
  },
  // Cluster changes affect cluster-related caches
  {
    eventType: 'cluster',
    storageKeys: [
      'map-cluster-to-contest-storage',
      'map-cluster-to-team-storage',
      'map-cluster-to-judge-storage',
      'cluster-storage'
    ]
  },
  // Contest changes affect contest-related caches
  {
    eventType: 'contest',
    storageKeys: [
      'map-contest-to-team-storage',
      'map-contest-to-judge-storage',
      'map-contest-to-organizer-storage',
      'map-cluster-to-contest-storage',
      'contest-storage'
    ]
  },
  // Scoresheet changes affect scoresheet caches
  {
    eventType: 'scoresheet',
    storageKeys: [
      'map-score-sheet-storage',
      'score-sheet-storage'
    ]
  },
  // Championship changes affect ranking caches
  {
    eventType: 'championship',
    storageKeys: [
      'rankings-storage',
      'map-contest-to-team-storage'
    ]
  }
];

/**
 * Initialize cache invalidation system
 */
export const initializeCacheInvalidation = () => {
  onDataChange((event: DataChangeEvent) => {
    const rulesToApply = CACHE_INVALIDATION_RULES.filter(rule => {
      const typeMatches = rule.eventType === event.type;
      const actionMatches = !rule.eventAction || rule.eventAction === event.action;
      const conditionMatches = !rule.condition || rule.condition(event);

      return typeMatches && actionMatches && conditionMatches;
    });

    rulesToApply.forEach(rule => {
      rule.storageKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          console.warn(`[CacheInvalidation] Failed to clear cache for ${key}:`, error);
        }
      });
    });
  });
};

/**
 * Manually invalidate specific caches
 * Useful for forced cache clearing
 */
export const invalidateCaches = (storageKeys: string[]) => {
  storageKeys.forEach(key => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`[CacheInvalidation] Failed to clear cache for ${key}:`, error);
    }
  });
};

/**
 * Clear all sessionStorage caches
 * Use with caution - this will clear ALL cached data
 */
export const clearAllCaches = () => {
  const keysToRemove: string[] = [];

  // Collect all keys that match our known cache patterns
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('storage') ||
      key.includes('cache') ||
      key.includes('map-') ||
      key.includes('store')
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`[CacheInvalidation] Failed to clear cache ${key}:`, error);
    }
  });
};
