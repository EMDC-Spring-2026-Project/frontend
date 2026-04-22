/**
 * OrganizerModal Component
 * 
 * Modal for creating and editing organizers with modern theme styling.
 * Features:
 * - Clean white background with subtle borders
 * - Green success theme for buttons
 * - Consistent typography with bold titles
 * - Modern form styling with proper spacing
 */
import { Button, TextField } from "@mui/material";
import Modal from "./Modal";
import theme from "../../theme";
import React, { useEffect, useState } from "react";
import { useOrganizerStore } from "../../store/primary_stores/organizerStore";
import useUserRoleStore from "../../store/map_stores/mapUserToRoleStore";
import toast from "react-hot-toast";
import { handleAccountError } from "../../utils/errorHandler";

export interface IOrganizerModalProps {
  open: boolean;
  handleClose: () => void;
  mode: "new" | "edit";
  organizerData?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    password: string;
  };
}

export default function OrganizerModal(props: IOrganizerModalProps) {
  const { handleClose, open, mode, organizerData } = props;
  const title = mode === "new" ? "New Organizer" : "Edit Organizer";

  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const organizerid = organizerData?.id;
  const { user, getUserByRole } = useUserRoleStore();

  const { createOrganizer, editOrganizer } = useOrganizerStore();

  // Fetch user data when editing organizer
  useEffect(() => {
    if (mode === "edit" && organizerData && organizerData.id) {
      getUserByRole(organizerData.id, 2).catch((error) => {
        // Silently handle 404 - organizer might not have a user mapping yet
        console.warn("Failed to fetch user by role for organizer:", error);
      });
    }
  }, [mode, organizerData, getUserByRole]);

  // Update form fields based on mode and data
  useEffect(() => {
    if (mode === "new") {
      // Reset fields when creating new organizer
      setFirstName("");
      setLastName("");
      setUsername("");
    } else if (mode === "edit") {
      if (organizerData) {
        // Set fields from organizer data
        setFirstName(organizerData.first_name || "");
        setLastName(organizerData.last_name || "");
        // Use user.username if available, otherwise keep current username
        if (user?.username) {
          setUsername(user.username);
        }
      }
    }
  }, [mode, organizerData, user]);

  const handleCloseModal = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    handleClose();
  };

  /**
   * Create a new organizer account with admin privileges
   * Sets default password and creates user role mapping
   */
  const handleCreateOrganizer = (event: React.FormEvent) => {
    event.preventDefault();
    // Remove hover/focus from the submit button to avoid lingering hover styles
    if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Close modal immediately for faster UX
    handleCloseModal();
    // Create organizer asynchronously
    createOrganizer({
      first_name: first_name,
      last_name: last_name,
      username: username,
      password: "password",
    })
      .then(() => {
        toast.success("Organizer created successfully!");
      })
      .catch((error: any) => {
        // Show error toast (modal already closed, user can retry by reopening)
        handleAccountError(error, "create");
      });
  };

  /**
   * Update existing organizer information
   * Preserves organizer ID while updating personal details and credentials
   */
  const handleEditOrganizer = (event: React.FormEvent) => {
    event.preventDefault();
    if (organizerid) {
      // Remove hover/focus from the submit button to avoid lingering hover styles
      if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Close modal immediately for faster UX
      handleCloseModal();
      // Update organizer asynchronously
      editOrganizer({
        id: organizerid,
        first_name,
        last_name,
        username,
        password: "password",
      })
        .then(() => {
          toast.success("Organizer updated successfully!");
        })
        .catch((error: any) => {
          // Show error toast (modal already closed, user can retry by reopening)
          handleAccountError(error, "update");
        });
    }
  };

  const buttonText = mode === "new" ? "Create Organizer" : "Update Organizer";

  const onSubmitHandler = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "new") {
      handleCreateOrganizer(e);
    } else if (mode === "edit") {
      handleEditOrganizer(e);
    }
  };

  return (
    <Modal
      open={open}
      handleClose={handleCloseModal}
      title={title}
    >
      <form
        onSubmit={onSubmitHandler}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextField
          required
          label="First Name"
          variant="outlined"
          value={first_name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFirstName(e.target.value)
          }
          sx={{ mt: 1, width: 300 }}
        />
        <TextField
          required
          label="Last Name"
          variant="outlined"
          value={last_name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLastName(e.target.value)
          }
          sx={{ mt: 3, width: 300 }}
        />
        <TextField
          required
          label="Email"
          variant="outlined"
          value={username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUsername(e.target.value)
          }
          sx={{ mt: 3, width: 300 }}
        />
        {/* Submit button - updated with smooth 3D effect and green glow */}
        <Button
          type="submit"
          sx={{
            width: 170,
            height: 44,
            bgcolor: theme.palette.success.main,
            color: "#fff",
            mt: 4,
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
          {buttonText}
        </Button>
      </form>
    </Modal>
  );
}
