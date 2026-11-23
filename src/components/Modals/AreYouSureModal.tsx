/**
 * AreYouSureModal Component
 * 
 * Confirmation modal with modern theme styling.
 * Features:
 * - Clean white background with subtle borders
 * - Green success theme for buttons
 * - Consistent typography with bold titles
 * - Modern form styling with proper spacing
 */
import { Button, Container, Typography } from "@mui/material";
import type { ReactNode } from "react";
import Modal from "./Modal";
import theme from "../../theme";

export interface IAreYouSureModalProps {
  open: boolean;
  handleClose: () => void;
  title: string;
  handleSubmit: () => void;
  /** Optional explanation shown above the buttons. */
  message?: ReactNode;
  /** Disables "Yes", e.g. while the message is still loading. */
  confirmDisabled?: boolean;
}

export default function AreYouSureModal(props: IAreYouSureModalProps) {
  const { handleClose, handleSubmit, open, title, message, confirmDisabled } = props;

  const handleSubmitModal = () => {
    handleSubmit();
    handleClose();
  };

  return (
    <Modal open={open} handleClose={handleClose} title={title}>
      {message && (
        <Typography
          component="div"
          sx={{ mb: 1, px: 1, textAlign: "center", fontSize: "0.95rem", color: "text.primary" }}
        >
          {message}
        </Typography>
      )}
      <Container
        sx={{
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "row",
          gap: 2,
        }}
      >
        {/* Yes button - updated with smooth 3D effect and green glow */}
        <Button
          type="button"
          onClick={handleSubmitModal}
          disabled={confirmDisabled}
          sx={{
            width: 90,
            height: 44,
            bgcolor: theme.palette.success.main,
            color: "#fff",
            mt: 2,
            textTransform: "none",
            borderRadius: "12px",
            boxShadow: `
              0 4px 12px rgba(76, 175, 80, 0.3),
              0 2px 4px rgba(76, 175, 80, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": { 
              bgcolor: theme.palette.success.dark,
              transform: "translateY(-2px)",
              boxShadow: `
                0 6px 16px rgba(76, 175, 80, 0.4),
                0 4px 8px rgba(76, 175, 80, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `,
            },
            "&:active": {
              transform: "translateY(0px)",
              boxShadow: `
                0 2px 8px rgba(76, 175, 80, 0.3),
                inset 0 2px 4px rgba(0, 0, 0, 0.1)
              `,
            },
          }}
        >
          Yes
        </Button>
        {/* No button - updated with smooth 3D effect */}
        <Button
          type="button"
          onClick={handleClose}
          sx={{
            width: 90,
            height: 44,
            bgcolor: theme.palette.grey[500],
            color: "#fff",
            mt: 2,
            textTransform: "none",
            borderRadius: "12px",
            boxShadow: `
              0 2px 8px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": { 
              bgcolor: theme.palette.grey[600],
              transform: "translateY(-2px)",
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
            },
            "&:active": {
              transform: "translateY(0px)",
              boxShadow: `
                0 1px 4px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px rgba(0, 0, 0, 0.1)
              `,
            },
          }}
        >
          No
        </Button>
      </Container>
    </Modal>
  );
}
