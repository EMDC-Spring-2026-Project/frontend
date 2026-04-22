import * as React from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Button, Stack, Typography, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import useOrganizerStore from "../../store/primary_stores/organizerStore";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import OrganizerModal from "../Modals/OrganizerModal";
import AreYouSureModal from "../Modals/AreYouSureModal";
import useMapContestOrganizerStore from "../../store/map_stores/mapContestToOrganizerStore";
import AssignContestModal from "../Modals/AssignContestModal";
import toast from "react-hot-toast";
import GroupIcon from "@mui/icons-material/Group";
import CampaignIcon from "@mui/icons-material/Campaign";

const Row = memo(function Row(props: {
  row: { id: number; first_name: string; last_name: string; organizer: any };
  onEdit: (organizer: any) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number) => void;
}) {
  const { row, onEdit, onDelete, onAssign } = props;
  const [open, setOpen] = useState(false);
  const [organizerId, setOrganizerId] = useState(0);
  const [contestId, setContestId] = useState(0);
  const [openAreYouSureUnassign, setOpenAreYouSureUnassign] = useState(false);

  const contestsByOrganizers = useMapContestOrganizerStore(
    (state) => state.contestsByOrganizers
  );
  const deleteContestOrganizerMapping = useMapContestOrganizerStore(
    (state) => state.deleteContestOrganizerMapping
  );

  const handleOpenAreYouSureUnassign = (
    organizerId: number,
    contestId: number
  ) => {
    setOrganizerId(organizerId);
    setContestId(contestId);
    setOpenAreYouSureUnassign(true);
  };

  const handleUnassign = (organizerId: number, contestId: number) => {
    deleteContestOrganizerMapping(organizerId, contestId);
  };

  return (
    <React.Fragment>
      <TableRow
        hover
        sx={{
          "& td": { borderBottomColor: "grey.200" },
        }}
      >
        <TableCell
          width={56}
          sx={{
            pl: { xs: 1, sm: 2 }, // ⭐ tighter padding on mobile
          }}
        >
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
            sx={{
              color: open ? "success.main" : "inherit",
              "&:hover": {
                bgcolor: (t) => alpha(t.palette.success.main, 0.08),
              },
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>

        <TableCell
          component="th"
          scope="row"
          sx={{ py: { xs: 1, sm: 2 }, pr: { xs: 1, sm: 2 } }} // ⭐ smaller vertical padding on xs
        >
          <Stack direction="row" alignItems="center" spacing={2} minWidth={0}>
            <Box
              aria-hidden
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: (t) => alpha(t.palette.success.light, 0.5),
                color: "success.dark",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <GroupIcon fontSize="small" />
            </Box>
            <Box minWidth={0}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontSize: { xs: "0.9rem", sm: "1rem" }, // ⭐ slightly smaller on mobile
                }}
                noWrap
                title={`${row.first_name} ${row.last_name}`}
              >
                {row.first_name} {row.last_name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
              >
                Organizer
              </Typography>
            </Box>
          </Stack>
        </TableCell>

        <TableCell
          align="right"
          sx={{
            whiteSpace: "nowrap",
            width: { xs: 1, sm: "auto" }, 
            pr: { xs: 1, sm: 2 },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }} 
            spacing={{ xs: 0.5, sm: 0.75 }}
            justifyContent="flex-end"
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{
              minHeight: { xs: "auto", sm: "35px" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <Button
              onClick={() => onAssign(row.id)}
              variant="contained"
              size="small"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.success.main, 0.85),
                color: "white",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.success.main, 0.95),
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
                px: { xs: 0.75, sm: 2 },
                py: { xs: 0.4, sm: 0.75 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                fontWeight: 500,
                minWidth: { xs: "100%", sm: "80px" },
                height: { xs: "30px", sm: "36px" },
                transition: "all 0.2s ease",
              }}
            >
              Assign
            </Button>
            <Button
              onClick={() => onEdit(row.organizer)}
              variant="outlined"
              size="small"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                borderColor: (t) => alpha(t.palette.grey[400], 0.5),
                color: "text.primary",
                bgcolor: "transparent",
                "&:hover": {
                  borderColor: (t) => alpha(t.palette.grey[600], 0.6),
                  bgcolor: (t) => alpha(t.palette.grey[100], 0.5),
                },
                px: { xs: 0.75, sm: 2 },
                py: { xs: 0.4, sm: 0.75 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                fontWeight: 500,
                minWidth: { xs: "100%", sm: "80px" },
                height: { xs: "30px", sm: "36px" },
                transition: "all 0.2s ease",
              }}
            >
              Edit
            </Button>
            <Button
              onClick={() => onDelete(row.id)}
              variant="outlined"
              size="small"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                borderColor: (t) => alpha(t.palette.error.light, 0.5),
                color: (t) => alpha(t.palette.error.main, 0.8),
                bgcolor: "transparent",
                "&:hover": {
                  borderColor: (t) => alpha(t.palette.error.main, 0.7),
                  bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                },
                px: { xs: 0.75, sm: 2 },
                py: { xs: 0.4, sm: 0.75 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                fontWeight: 500,
                minWidth: { xs: "100%", sm: "80px" },
                height: { xs: "30px", sm: "36px" },
                transition: "all 0.2s ease",
              }}
            >
              Delete
            </Button>
          </Stack>
        </TableCell>
      </TableRow>

      <TableRow sx={{ display: open ? "table-row" : "none" }}>
        <TableCell
          style={{ paddingBottom: 0, paddingTop: 0 }}
          colSpan={3}
          sx={{ borderBottom: 0, px: { xs: 1, sm: 2 } }} 
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1, mb: 1, mx: { xs: 0.5, sm: 1.5 } }}>
              {(() => {
                const contests = contestsByOrganizers[row.id];
                const hasContests =
                  contests &&
                  contests !== null &&
                  Array.isArray(contests) &&
                  contests.length > 0;
                return hasContests ? (
                  contests.map((contest: any) => (
                    <Box
                      key={`org-${row.id}-contest-${contest.id}`}
                      sx={{
                        py: 1,
                        borderBottom: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Stack
                          direction="row"
                          spacing={1.25}
                          alignItems="center"
                          sx={{ minWidth: 0 }}
                        >
                          <Box
                            aria-hidden
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              bgcolor: (t) =>
                                alpha(t.palette.success.main, 0.1),
                              color: "success.dark",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <CampaignIcon sx={{ fontSize: 16 }} />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: "0.8rem", sm: "0.875rem" },
                            }}
                          >
                            {contest.name}
                          </Typography>
                        </Stack>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            handleOpenAreYouSureUnassign(row.id, contest.id)
                          }
                          sx={{
                            textTransform: "none",
                            borderRadius: 2,
                            borderColor: (t) =>
                              alpha(t.palette.grey[400], 0.5),
                            color: "text.primary",
                            bgcolor: "transparent",
                            "&:hover": {
                              borderColor: (t) =>
                                alpha(t.palette.grey[600], 0.6),
                              bgcolor: (t) =>
                                alpha(t.palette.grey[100], 0.5),
                            },
                            px: { xs: 0.75, sm: 2 },
                            py: { xs: 0.3, sm: 0.75 },
                            fontSize: { xs: "0.7rem", sm: "0.875rem" },
                            fontWeight: 500,
                            minWidth: { xs: "80px", sm: "100px" },
                            height: { xs: "28px", sm: "36px" },
                            transition: "all 0.2s ease",
                          }}
                        >
                          Unassign
                        </Button>
                      </Stack>
                    </Box>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 1, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    No Contests Assigned
                  </Typography>
                );
              })()}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <AreYouSureModal
        open={openAreYouSureUnassign}
        handleClose={() => setOpenAreYouSureUnassign(false)}
        title="Are you sure you want to unassign this contest?"
        handleSubmit={() => handleUnassign(organizerId, contestId)}
      />
    </React.Fragment>
  );
});

export default function AdminOrganizerTable() {
  const { allOrganizers, fetchAllOrganizers, deleteOrganizer } =
    useOrganizerStore();
  const contestsByOrganizers = useMapContestOrganizerStore(
    (state) => state.contestsByOrganizers
  );
  const fetchContestsByOrganizers = useMapContestOrganizerStore(
    (state) => state.fetchContestsByOrganizers
  );
  const [openOrganizerModal, setOpenOrganizerModal] = useState(false);
  const [organizerData, setOrganizerData] = useState<any>(null);
  const [openAreYouSure, setOpenAreYouSure] = useState(false);
  const [openAssignContest, setOpenAssignContest] = useState(false);
  const [organizerId, setOrganizerId] = useState(0);

  useEffect(() => {
    fetchAllOrganizers();
  }, [fetchAllOrganizers]);

  useEffect(() => {
    if (!contestsByOrganizers || Object.keys(contestsByOrganizers).length === 0) {
      fetchContestsByOrganizers();
    }
  }, [contestsByOrganizers, fetchContestsByOrganizers]);

  const rows = useMemo(
    () =>
      allOrganizers
        .filter((organizer: any) => organizer && organizer.id)
        .map((organizer: any) => ({
          id: organizer.id,
          first_name: organizer.first_name,
          last_name: organizer.last_name,
          organizer: organizer,
        })),
    [allOrganizers]
  );

  const handleOpenEditOrganizer = useCallback((organizer: any) => {
    setOrganizerData({
      id: organizer.id,
      first_name: organizer.first_name,
      last_name: organizer.last_name,
      username: organizer.username,
    });
    setOpenOrganizerModal(true);
  }, []);

  const handleDelete = async (id: number) => {
    if (!id || id === 0) {
      toast.error("Invalid organizer ID. Please try again.");
      return;
    }
    try {
      const organizer = allOrganizers.find((org: any) => org.id === id);
      const organizerName = organizer
        ? `${organizer.first_name} ${organizer.last_name}`.trim()
        : null;

      await deleteOrganizer(id);

      if (organizerName) {
        const { removeOrganizerFromAllContests } =
          useMapContestOrganizerStore.getState();
        removeOrganizerFromAllContests(id, organizerName);
      }

      toast.success("Organizer deleted successfully!");
      setOpenAreYouSure(false);
      setOrganizerId(0);
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to delete organizer. Please try again.";
      toast.error(errorMessage);
      console.error("Failed to delete organizer:", error);
    }
  };

  const handleOpenAreYouSure = useCallback((id: number) => {
    setOrganizerId(id);
    setOpenAreYouSure(true);
  }, []);

  const handleOpenAssignContest = useCallback((id: number) => {
    setOrganizerId(id);
    setOpenAssignContest(true);
  }, []);

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        width: "100%",
        overflowX: "auto",
        borderRadius: 0,
        boxShadow: "none",
        backgroundColor: "transparent",
      }}
    >
      <Table
        aria-label="collapsible table"
        size="small" 
        sx={{
          minWidth: 480, 
        }}
      >
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                fontWeight: 700,
                bgcolor: (t) => alpha(t.palette.success.main, 0.04),
                borderBottomColor: "grey.300",
                py: { xs: 1, sm: 1.5 },
              },
            }}
          >
            <TableCell width={56} />
            <TableCell component="th" scope="row">
              Name
            </TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              onEdit={handleOpenEditOrganizer}
              onDelete={handleOpenAreYouSure}
              onAssign={handleOpenAssignContest}
            />
          ))}
        </TableBody>
      </Table>

      <OrganizerModal
        open={openOrganizerModal}
        handleClose={() => {
          setOpenOrganizerModal(false);
          setOrganizerData(null);
        }}
        mode={organizerData ? "edit" : "new"}
        organizerData={organizerData}
      />
      <AreYouSureModal
        open={openAreYouSure}
        handleClose={() => {
          setOpenAreYouSure(false);
          setOrganizerId(0);
        }}
        title="Are you sure you want to delete this organizer?"
        handleSubmit={() => handleDelete(organizerId)}
      />
      <AssignContestModal
        organizerId={organizerId}
        open={openAssignContest}
        handleClose={() => setOpenAssignContest(false)}
      />
    </TableContainer>
  );
}
