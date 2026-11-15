import { Alert, Button, Container } from "@mui/material";

export default function BulkScoreLoadError({
  message, onRetry,
}: { message: string; onRetry: () => void }) {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Alert severity="error" action={<Button onClick={onRetry}>Try again</Button>}>
        {message}
      </Alert>
    </Container>
  );
}
