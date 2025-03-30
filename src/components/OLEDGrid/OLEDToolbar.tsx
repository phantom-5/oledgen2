import React from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, ButtonGroup, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { clearGrid, fillGrid, undo, redo } from '../../redux/oledSlice';
import styles from './OLEDToolbar.module.css';

const OLEDToolbar: React.FC = () => {
  const dispatch = useDispatch();

  return (
    <Box className={styles['toolbar-container']}>
      <ButtonGroup variant="outlined" color="primary" aria-label="OLED editing tools">
        <Tooltip title="Clear all pixels">
          <Button onClick={() => dispatch(clearGrid())} startIcon={<DeleteIcon />}>
            Clear
          </Button>
        </Tooltip>
        
        <Tooltip title="Fill all pixels">
          <Button onClick={() => dispatch(fillGrid())} startIcon={<FormatColorFillIcon />}>
            Fill
          </Button>
        </Tooltip>
        
        <Tooltip title="Undo last action">
          <Button onClick={() => dispatch(undo())} startIcon={<UndoIcon />}>
            Undo
          </Button>
        </Tooltip>
        
        <Tooltip title="Redo last action">
          <Button onClick={() => dispatch(redo())} startIcon={<RedoIcon />}>
            Redo
          </Button>
        </Tooltip>
      </ButtonGroup>
    </Box>
  );
};

export default OLEDToolbar; 