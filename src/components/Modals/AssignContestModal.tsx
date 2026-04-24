/**
 * AssignContestModal Component
 * 
 * Modal for assigning contests to organizers with modern theme styling.
 * Features:
 * - Clean white background with subtle borders
 * - Green success theme for buttons
 * - Consistent typography with bold titles
 * - Modern form styling with proper spacing
 */
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import Modal from "./Modal";
import theme from "../../theme";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Contest } from "../../types";
import useContestStore from "../../store/primary_stores/contestStore";
import useMapContestOrganizerStore from "../../store/map_stores/mapContestToOrganizerStore";

export interface IAssignContestModalProps {
  organizerId: number;
  open: boolean;
  handleClose: () => void;
}

export default function OrganizerModal(props: IAssignContestModalProps) {
  const { handleClose, open, organizerId } = props;

  // Contest store for available contests - use selector for reactive updates
  const allContests = useContestStore((state) => state.allContests);

  // Contest-organizer mapping store for assignments - use selector for reactive updates
  const contestsByOrganizers = useMapContestOrganizerStore((state) => state.contestsByOrganizers);
  const createContestOrganizerMapping = useMapContestOrganizerStore((state) => state.createContestOrganizerMapping);
  const fetchContestsByOrganizerId = useMapContestOrganizerStore((state) => state.fetchContestsByOrganizerId);

  const title = "Assign Contest To Organizer";
  const [contestId, setContestId] = useState(0);
  
  // Use selector to reactively get assigned contests for this organizer
  const assignedContests = contestsByOrganizers[organizerId] || [];

  // Close modal and reset form
  const handleCloseModal = () => {
    handleClose();
    setContestId(0);
  };

  // Assign contest to organizer
  const handleAssignContest = (event: React.FormEvent) => {
    event.preventDefault();

    if (!contestId) {
      toast.error("Please select a contest before assigning.");
      return;
    }

    if (organizerId) {
      handleClose();
      createContestOrganizerMapping(organizerId, contestId)
        .then(async () => {
          // Refresh the contests for this organizer to ensure UI updates
          await fetchContestsByOrganizerId(organizerId);
          toast.success("Contest assigned to organizer successfully!");
        })
        .catch((error) => {
          console.error("Failed to assign contest: ", error);
          toast.error("Failed to assign contest. Please try again.");
        });
    }
  };

  // Form submission handler
  const onSubmitHandler = (e: React.FormEvent) => {
    e.preventDefault();
    handleAssignContest(e);
  };

  // Filter out already assigned contests
  const availableContests = allContests?.filter(
    (contest: Contest) =>
      !assignedContests.some((assigned) => assigned.id === contest.id)
  );

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
        <FormControl
          required
          sx={{
            width: { xs: "100%", sm: 350 },
            mt: { xs: 2, sm: 3 },
            "& .MuiInputLabel-root": {
              fontSize: { xs: "0.9rem", sm: "1rem" },
            },
            "& .MuiSelect-select": {
              fontSize: { xs: "0.9rem", sm: "1rem" },
            },
            "& .MuiMenuItem-root": {
              fontSize: { xs: "0.9rem", sm: "1rem" },
            },
          }}
        >
          <InputLabel>Contest</InputLabel>
          <Select
            value={contestId}
            label="Contest"
            sx={{ textAlign: "left" }}
            onChange={(e) => setContestId(Number(e.target.value))}
          >
            {availableContests?.map((contest: Contest) => (
              <MenuItem key={contest.id} value={contest.id}>
                {contest.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          type="submit"
          sx={{
            width: { xs: "100%", sm: 170 },
            height: { xs: 40, sm: 44 },
            bgcolor: theme.palette.success.main,
            color: "#fff",
            mt: { xs: 3, sm: 4 },
            textTransform: "none",
            borderRadius: "12px",
            fontSize: { xs: "0.9rem", sm: "1rem" },
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
            px: { xs: 3, sm: 4.5 },
            py: { xs: 1, sm: 1.25 },
            whiteSpace: "nowrap",
          }}
        >
          Assign Contest
        </Button>
      </form>
    </Modal>
  );
}
