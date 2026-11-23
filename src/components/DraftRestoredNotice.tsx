import { Alert, Button } from "@mui/material";

/** Tells the judge their unsaved scores were brought back after a reload. */
export default function DraftRestoredNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <Alert
      severity="info"
      sx={{ mb: 2, textAlign: "left" }}
      action={
        <Button color="inherit" size="small" onClick={onDiscard}>
          Discard
        </Button>
      }
    >
      We restored scores you typed on this device that weren't saved yet. Press Save to keep them.
    </Alert>
  );
}
