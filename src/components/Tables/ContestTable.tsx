// ==============================
// Component: ContestTable
// Simple contest listing table with clickable rows.
// Displays contest information with status indicators and navigation.
// ==============================

// ==============================
// UI Libraries & Theme
// ==============================
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import theme from "../../theme";

// ==============================
// Types & Interfaces
// ==============================

interface ContestRow {
  id: number;
  name: string;
  date: string;
  status: string;
}

interface ContestTableProps {
  rows: ContestRow[];
  isLoading: boolean;
  onRowClick: (id: number) => void;
}

export default function ContestTable({
  rows,
  isLoading,
  onRowClick,
}: ContestTableProps) {
  return (
    <div style={{ position: "relative" }}>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          overflowX: "auto",
          boxShadow: 3,
          zIndex: 1, // Ensure table is above gear
          position: "relative",
        }}
      >
        <Table
          aria-label="contest table"
          aria-busy={isLoading}
          sx={{
            minWidth: 480,
            "& th:first-of-type, & td:first-of-type": { pl: 1 },
          }}
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
              <TableCell sx={{ fontWeight: 700, color: "#fff" }}>
                Contest Name
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff" }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff" }}>Status</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography>Loading contests...</Typography>
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography>No contests are available to view yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            {!isLoading &&
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  tabIndex={0}
                  aria-label={`View ${row.name}, ${row.status}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.id);
                    }
                  }}
                  onClick={() => onRowClick(row.id)}
                  sx={{
                    cursor: "pointer",
                    "&:focus-visible": {
                      outline: `3px solid ${theme.palette.primary.main}`,
                      outlineOffset: -3,
                    },
                    transition: "background-color 0.2s ease, transform 0.1s ease",
                    "&:hover": {
                      backgroundColor: theme.palette.primary.light,
                      transform: "scale(1.01)",
                    },
                  }}
                >
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell
                    sx={{
                      color:
                        row.status === "Finalized"
                          ? "green"
                          : row.status === "In Progress"
                          ? "orange"
                          : "red",
                      fontWeight: 600,
                    }}
                  >
                    {row.status}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
