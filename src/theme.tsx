import { createTheme } from "@mui/material/styles";

// Brand green darkened just enough for 4.5:1 contrast with white (WCAG AA for
// normal-size text). Use it for green text and for green buttons with white
// text; the lighter brand green (#00a353) is only 3.3:1.
export const ACCESSIBLE_GREEN = "#008542";

const theme = createTheme({
  palette: {
    primary: {
      main: "#00a353", // main green
      dark: "#17442D", // dark green
      light: "#e8eddb",
    },
    secondary: {
      main: "#ffffff", // white
      light: "#CACCC6", // grey
      dark: "#000000", // black
    },
    background: {
      default: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Open Sans, sans-serif",
    subtitle1: {
      fontSize: 12,
    },
    body1: {
      color: "#000000",
    },
    body2: {
      fontSize: 16,
      color: ACCESSIBLE_GREEN,
    },
    h1: {
      fontWeight: "550",
      fontSize: 28,
      color: ACCESSIBLE_GREEN,
    },
    h2: {
      fontWeight: "550",
      fontSize: 20,
      color: ACCESSIBLE_GREEN,
    },
  },
  components: {


    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            padding: "8px 4px",
            fontSize: "0.875rem",
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.sparkle-gold.MuiTableRow-root": {
            backgroundColor: "#ffeb99 !important",
          },
          "&.sparkle-silver.MuiTableRow-root": {
            backgroundColor: "#e0e0e0 !important",
          },
          "&.sparkle-bronze.MuiTableRow-root": {
            backgroundColor: "#d6a56f !important",
          },
        },
      },
    },
  },
});

export default theme;
