import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "emdc-score-draft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // ignore drafts older than a week

type StoredDraft<T> = { savedAt: number; values: T };

function readDraft<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft<T>;
    if (!draft || typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return draft.values;
  } catch {
    return null;
  }
}

function writeDraft<T>(storageKey: string, values: T) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // Storage full or blocked (private mode): drafts are a convenience only.
  }
}

function removeDraft(storageKey: string) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

/**
 * A stable string for comparing form values: empty entries (undefined, null,
 * "", 0) are dropped and numeric strings become numbers, so "4.5" and 4.5,
 * or a missing penalty and a 0 penalty, count as the same.
 */
function normalize(value: unknown): unknown {
  if (value === undefined || value === null || value === "" || value === 0) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const asNumber = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(asNumber)) return asNumber === 0 ? undefined : asNumber;
    return trimmed === "" ? undefined : value;
  }
  if (typeof value === "object") {
    const entries = Object.keys(value as object)
      .sort()
      .map((key) => [key, normalize((value as Record<string, unknown>)[key])] as const)
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}
const fingerprint = (value: unknown) => JSON.stringify(normalize(value) ?? null);

type Options<T> = {
  /** Identifies the sheet, e.g. `${judgeId}:${teamId}:${sheetType}`. Null while unknown. */
  draftKey: string | null;
  /** True once the form has been filled from the server. */
  ready: boolean;
  /** The form's current values. */
  values: T;
  /** Replaces the form's values (used to restore or discard a draft). */
  setValues: (values: T) => void;
  /** Don't keep drafts, e.g. for a sheet that can no longer be edited. */
  disabled?: boolean;
};

/**
 * Keeps scores a judge has typed but not saved in this browser, so a refresh,
 * a Wi-Fi drop or an expired login doesn't lose them. On load, a draft that
 * differs from the saved sheet is put back into the form.
 */
export function useScoreDraft<T>({ draftKey, ready, values, setValues, disabled = false }: Options<T>) {
  const storageKey = draftKey ? PREFIX + draftKey : null;
  const [pendingCheck, setPendingCheck] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const activeKey = useRef<string | null>(null);
  const savedFingerprint = useRef("");
  const savedValues = useRef<T | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // 1) When the sheet becomes ready, wait one render so the form holds the
  //    values loaded from the server.
  useEffect(() => {
    if (!storageKey || !ready) {
      activeKey.current = null;
      return;
    }
    if (activeKey.current !== storageKey && pendingCheck !== storageKey) {
      setPendingCheck(storageKey);
    }
  }, [storageKey, ready, pendingCheck]);

  // 2) Remember the saved values, then restore a draft that differs from them.
  useEffect(() => {
    if (!pendingCheck || pendingCheck !== storageKey) return;
    setPendingCheck(null);
    activeKey.current = pendingCheck;
    savedFingerprint.current = fingerprint(values);
    savedValues.current = values;
    setRestored(false);

    const draft = disabled ? null : readDraft<T>(pendingCheck);
    if (draft !== null && fingerprint(draft) !== savedFingerprint.current) {
      setValues(draft);
      setRestored(true);
    } else {
      removeDraft(pendingCheck);
    }
  }, [pendingCheck, storageKey, values, disabled, setValues]);

  // 3) Keep the draft in step with what the judge types.
  useEffect(() => {
    if (!storageKey || activeKey.current !== storageKey) return;
    if (disabled || fingerprint(values) === savedFingerprint.current) removeDraft(storageKey);
    else writeDraft(storageKey, values);
  }, [values, storageKey, disabled]);

  /** Call after the server confirms a Save or Submit. */
  const markSaved = useCallback(() => {
    savedFingerprint.current = fingerprint(valuesRef.current);
    savedValues.current = valuesRef.current;
    if (storageKey) removeDraft(storageKey);
    setRestored(false);
  }, [storageKey]);

  /** Throws the draft away and puts the saved values back. */
  const discardDraft = useCallback(() => {
    if (storageKey) removeDraft(storageKey);
    if (savedValues.current !== null) setValues(savedValues.current);
    setRestored(false);
  }, [storageKey, setValues]);

  return { restored, markSaved, discardDraft };
}
