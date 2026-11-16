import { useCallback, useEffect, useRef, useState } from "react";
import { useMapScoreSheetStore } from "../store/map_stores/mapScoreSheetStore";
import { useScoreSheetStore } from "../store/primary_stores/scoreSheetStore";

export type ScoreSheetLoadStatus = "loading" | "ready" | "error";

/**
 * Loads one judge's scoresheet for a team into the scoresheet store.
 * Reports "error" when it can't be loaded, so the page can show a retry
 * instead of an empty form that can't be saved.
 */
export function useScoreSheetLoader(
  judgeId: number | null,
  teamId: number | null,
  sheetType: number
) {
  const { fetchScoreSheetWithData } = useMapScoreSheetStore();
  const { clearScoreSheet, setScoreSheet } = useScoreSheetStore();
  const [loadStatus, setLoadStatus] = useState<ScoreSheetLoadStatus>("loading");
  const latestRequest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latestRequest.current;
    clearScoreSheet();

    if (!judgeId || !teamId) {
      setLoadStatus("error");
      return;
    }

    setLoadStatus("loading");
    fetchScoreSheetWithData(judgeId, teamId, sheetType)
      .then((sheet) => {
        if (request !== latestRequest.current) return;
        if (!sheet?.id) throw new Error("Scoresheet not found");
        setScoreSheet(sheet);
        setLoadStatus("ready");
      })
      .catch((error) => {
        if (request !== latestRequest.current) return;
        console.error("Error fetching scoresheet:", error);
        setLoadStatus("error");
      });
  }, [judgeId, teamId, sheetType, fetchScoreSheetWithData, clearScoreSheet, setScoreSheet]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loadStatus, reload };
}
