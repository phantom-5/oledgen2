import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemText, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LoadIcon from '@mui/icons-material/FolderOpen';
import { RootState } from '../../redux/store';
import { 
  setCurrentDesignName, 
  saveDesign, 
  loadDesign, 
  deleteDesign,
  SavedDesign
} from '../../redux/oledSlice';
import styles from './SaveLoadDesigns.module.css';

const SaveLoadDesigns: React.FC = () => {
  const dispatch = useDispatch();
  const { currentDesignName, savedDesigns } = useSelector((state: RootState) => state.oled);
  const { mode } = useSelector((state: RootState) => state.theme);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [designToDelete, setDesignToDelete] = useState<SavedDesign | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setCurrentDesignName(e.target.value));
  };

  const handleSaveDesign = () => {
    dispatch(saveDesign());
  };

  const handleLoadDesign = (id: string) => {
    dispatch(loadDesign(id));
  };

  const openDeleteDialog = (design: SavedDesign, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the design when clicking delete
    setDesignToDelete(design);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDesign = () => {
    if (designToDelete) {
      dispatch(deleteDesign(designToDelete.id));
      setIsDeleteDialogOpen(false);
      setDesignToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Paper 
      elevation={3} 
      className={styles['save-load-container']}
      sx={{ 
        backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
        padding: 2,
        marginBottom: 2 
      }}
    >
      <Typography variant="h6" gutterBottom>
        Save / Load Designs
      </Typography>
      
      <Box className={styles['save-container']}>
        <TextField 
          label="Design Name" 
          variant="outlined" 
          fullWidth 
          value={currentDesignName}
          onChange={handleNameChange}
          className={styles['design-name-input']}
        />
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />} 
          onClick={handleSaveDesign}
          sx={{ mt: 1 }}
        >
          Save Design
        </Button>
      </Box>
      
      {savedDesigns.length > 0 && (
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>
            Saved Designs
          </Typography>
          <List className={styles['designs-list']}>
            {savedDesigns.map((design) => (
              <ListItem 
                key={design.id}
                className={styles['design-item']}
                sx={{ 
                  backgroundColor: mode === 'dark' ? '#444' : '#e0e0e0',
                  mb: 1,
                  borderRadius: 1,
                  padding: 0
                }}
                disablePadding
              >
                <ListItemButton onClick={() => handleLoadDesign(design.id)}>
                  <ListItemText 
                    primary={design.name} 
                    secondary={`Created: ${formatDate(design.createdAt)}`} 
                  />
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={(e) => openDeleteDialog(design, e)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Design</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{designToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDesign} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SaveLoadDesigns; 