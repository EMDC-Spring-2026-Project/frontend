import { useEffect, useRef, useState, type ReactNode } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import { validateScore } from "../utils/scoreValidation";

type ScoreInputProps = Omit<TextFieldProps, "value" | "onChange" | "error" | "helperText" | "type"> & {
  /** The saved score for this box (0, "" and null count as empty). */
  value: number | string | null | undefined;
  low: number;
  high: number;
  /** Called with the score when it is valid, or undefined when empty or invalid. */
  onScoreChange: (value: number | undefined) => void;
  /** Called when the box starts or stops showing an error. */
  onErrorChange?: (hasError: boolean) => void;
  /** Shown under the box when there is no error. */
  hint?: ReactNode;
};

const toText = (value: ScoreInputProps["value"]) =>
  value === undefined || value === null || value === "" || value === 0 ? "" : String(value);

/**
 * A score box that keeps what the judge typed and explains what is wrong
 * (too high, too low, not a whole or half point) instead of clearing it.
 */
export default function ScoreInput({
  value,
  low,
  high,
  onScoreChange,
  onErrorChange,
  hint,
  slotProps,
  ...textFieldProps
}: ScoreInputProps) {
  const [text, setText] = useState(() => toText(value));
  const [error, setError] = useState<string | null>(null);
  const lastSent = useRef(value);
  // Latest callback, so parents can pass an inline function.
  const onErrorChangeRef = useRef(onErrorChange);
  onErrorChangeRef.current = onErrorChange;

  // Reload the box when the score changes from outside (sheet loaded, reset).
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(toText(value));
      setError(null);
      onErrorChangeRef.current?.(false);
    }
  }, [value]);

  // A collapsed row unmounts its box, which discards an invalid entry.
  useEffect(() => () => onErrorChangeRef.current?.(false), []);

  return (
    <TextField
      {...textFieldProps}
      type="text"
      value={text}
      error={error !== null}
      helperText={error ?? hint}
      onChange={(e) => {
        const result = validateScore(e.target.value, low, high);
        setText(e.target.value);
        setError(result.error);
        onErrorChange?.(result.error !== null);
        lastSent.current = result.value;
        onScoreChange(result.value);
      }}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: "decimal",
          "aria-invalid": error !== null,
          ...(slotProps?.htmlInput as object | undefined),
        },
      }}
    />
  );
}
