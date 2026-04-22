/**
 * ContestModal Component
 * 
 * Modal for creating and editing contests with modern theme styling.
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
import toast from "react-hot-toast";
import { useContestStore } from "../../store/primary_stores/contestStore";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateField } from "@mui/x-date-pickers/DateField";
import useMapContestOrganizerStore from "../../store/map_stores/mapContestToOrganizerStore";

export interface IContestModalProps {
  open: boolean;
  handleClose: () => void;
  mode: "new" | "edit";
  contestData?: {
    contestid: number;
    name: string;
    date: string;
  };
}

export default function ContestModal(props: IContestModalProps) {
  const { handleClose, open, mode, contestData } = props;
  const title = mode === "new" ? "New Contest" : "Edit Contest";

  const [contestName, setContestName] = useState("");
  //const [contestDate, setContestDate] = useState("2024-11-13");
  const contestid = contestData?.contestid;
  // Use selectors to subscribe only to needed state
  const createContest = useContestStore((state) => state.createContest);
  const editContest = useContestStore((state) => state.editContest);
  const allContests = useContestStore((state) => state.allContests);
  const { fetchOrganizerNamesByContests } = useMapContestOrganizerStore();

  const [contestDate, setContestDate] = React.useState<Dayjs | null>(null);

  useEffect(() => {
    if (contestData) {
      setContestName(contestData.name);
      setContestDate(dayjs(contestData.date));
    }
  }, [contestData]);

  const handleCreateContest = (event: React.FormEvent) => {
    event.preventDefault();
    handleClose();
    createContest({
      name: contestName,
      date: contestDate ? contestDate.format("YYYY-MM-DD") : "",
      is_open: false,
      is_tabulated: false,
    })
      .then(async () => {
        await fetchOrganizerNamesByContests();
        toast.success("Contest created successfully!");
      })
      .catch((error) => {
        console.error("Failed to create contest: ", error);
        toast.error("Failed to create contest. Please try again.");
      });
  };

  const handleEditContest = (event: React.FormEvent) => {
    event.preventDefault();
    if (contestid) {
      // Get the current contest data to preserve is_open and is_tabulated
      const currentContest = allContests.find((c) => c.id === contestid);
      if (!currentContest) {
        toast.error("Contest not found. Please refresh and try again.");
        return;
      }

      handleClose();
      editContest({
        id: contestid,
        name: contestName,
        date: contestDate ? contestDate.format("YYYY-MM-DD") : "",
        // Preserve existing is_open and is_tabulated values
        is_open: currentContest.is_open,
        is_tabulated: currentContest.is_tabulated,
      })
        .then(() => {
          toast.success("Contest updated successfully!");
        })
        .catch((error) => {
          console.error("Failed to edit contest: ", error);
          toast.error("Failed to update contest. Please try again.");
        });
    }
  };

  const buttonText = mode === "new" ? "Create Contest" : "Update Contest";
  const handleSubmit = mode === "new" ? handleCreateContest : handleEditContest;

  return (
    <Modal
      open={open}
      handleClose={handleClose}
      title={title}
    >
      <form
        onSubmit={handleSubmit}
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
          label="Contest Name"
          variant="outlined"
          value={contestName}
          onChange={(e: any) => setContestName(e.target.value)}
          sx={{ mt: 1, width: 300 }}
        />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateField
            label="Date"
            value={contestDate}
            onChange={(newValue) => setContestDate(newValue)}
            sx={{ mt: 2, width: 300 }}
          />
        </LocalizationProvider>
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
