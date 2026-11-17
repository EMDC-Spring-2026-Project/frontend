import { useCallback, useState } from "react";

/** Tracks which score boxes currently show a validation error. */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, true>>({});

  const setFieldError = useCallback((key: string | number, hasError: boolean) => {
    setErrors((prev) => {
      if (Boolean(prev[key]) === hasError) return prev;
      const next = { ...prev };
      if (hasError) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  return { hasFieldErrors: Object.keys(errors).length > 0, setFieldError };
}
