import { useState } from "react";
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton } from "@mui/material";
import { Menu, AccountCircle, CalendarToday, NoteAdd, Logout } from "@mui/icons-material";
import { Link } from "react-router-dom";

const Sidebar = ({ onLogout }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton color="inherit" onClick={() => setOpen(true)} aria-label="open menu">
        <Menu />
      </IconButton>
      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <List>
          <ListItem  component={Link} to="/profile" onClick={() => setOpen(false)}>
            <ListItemIcon><AccountCircle /></ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItem>
          <ListItem component={Link} to="/apply-leave/short" onClick={() => setOpen(false)}>
    <ListItemIcon><NoteAdd /></ListItemIcon>
    <ListItemText primary="Short Leave" />
  </ListItem>
  <ListItem component={Link} to="/apply-leave/annual" onClick={() => setOpen(false)}>
                <ListItemIcon><NoteAdd /></ListItemIcon>
                <ListItemText primary="Annual Leave" />
              </ListItem>
          <ListItem  component={Link} to="/leave-calendar" onClick={() => setOpen(false)}>
            <ListItemIcon><CalendarToday /></ListItemIcon>
            <ListItemText primary="Leave Calendar" />
          </ListItem>
          <ListItem  onClick={() => { onLogout(); setOpen(false); }}>
            <ListItemIcon><Logout /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;
