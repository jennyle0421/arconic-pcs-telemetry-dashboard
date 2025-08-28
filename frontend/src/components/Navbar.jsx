import React from "react";
import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export default function Navbar({ colorMode }) {
  return (
    <AppBar position="static" color="primary" elevation={3}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6">
          Rolling Mill PCS Telemetry Dashboard
        </Typography>
        <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
          {colorMode.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
