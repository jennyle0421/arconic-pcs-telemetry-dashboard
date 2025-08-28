import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#004B87", // Arconic industrial blue
    },
    secondary: {
      main: "#FF6B00", // Alerts, actions
    },
    background: {
      default: "#F5F6F7",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F2937",
      secondary: "#4B5563",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h4: {
      fontWeight: 600,
      letterSpacing: "0.5px",
    },
    body1: {
      fontSize: "0.95rem",
    },
  },
});

export default theme;
