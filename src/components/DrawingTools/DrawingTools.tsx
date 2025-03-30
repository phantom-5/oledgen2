import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Paper, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton, 
  Tooltip,
  FormControlLabel,
  Checkbox,
  Box,
  Switch
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import RectangleOutlinedIcon from '@mui/icons-material/RectangleOutlined';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import RoundedCornerIcon from '@mui/icons-material/RoundedCorner';
import CreateIcon from '@mui/icons-material/Create';
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import { RootState } from '../../redux/store';
import { setTool, setFillOption } from '../../redux/oledSlice';
import { 
  TOOL_PIXEL, 
  TOOL_LINE, 
  TOOL_RECTANGLE, 
  TOOL_CIRCLE,
  TOOL_ROUNDED_RECTANGLE,
  TOOL_TRIANGLE,
  TOOL_FREEHAND,
  TOOL_FILL
} from '../../utils/CONSTANTS';
import styles from './DrawingTools.module.css';

const DrawingTools: React.FC = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);
  const { tool, options } = useSelector((state: RootState) => state.oled.drawing);
  
  // Set the current drawing tool
  const handleToolSelect = (newTool: string) => {
    dispatch(setTool(newTool));
  };
  
  // Toggle fill option for shape tools
  const handleFillToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFillOption({ fill: event.target.checked }));
  };
  
  // Toggle fill color (black/white)
  const handleFillColorToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFillOption({ fillColor: event.target.checked }));
  };
  
  // Determine if the fill option should be shown (only for rectangle, rounded-rectangle, circle and triangle)
  const showFillOption = [TOOL_RECTANGLE, TOOL_CIRCLE, TOOL_ROUNDED_RECTANGLE, TOOL_TRIANGLE].includes(tool);
  
  return (
    <Paper
      elevation={3}
      className={styles['drawing-tools-container']}
      sx={{
        backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
        padding: 2,
        marginBottom: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Drawing Tools
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <ToggleButtonGroup
          value={tool}
          exclusive
          onChange={(event, newTool) => {
            if (newTool !== null) {
              handleToolSelect(newTool);
            }
          }}
          aria-label="drawing tools"
          className={styles['toggle-button-group']}
        >
          <Tooltip title="Pixel">
            <ToggleButton value={TOOL_PIXEL} aria-label="pixel">
              <BrushIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Freehand">
            <ToggleButton value={TOOL_FREEHAND} aria-label="freehand">
              <CreateIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Line">
            <ToggleButton value={TOOL_LINE} aria-label="line">
              <LinearScaleIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Rectangle">
            <ToggleButton value={TOOL_RECTANGLE} aria-label="rectangle">
              <RectangleOutlinedIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Rounded Rectangle">
            <ToggleButton value={TOOL_ROUNDED_RECTANGLE} aria-label="rounded rectangle">
              <RoundedCornerIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Circle">
            <ToggleButton value={TOOL_CIRCLE} aria-label="circle">
              <CircleOutlinedIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Triangle">
            <ToggleButton value={TOOL_TRIANGLE} aria-label="triangle">
              <ChangeHistoryIcon />
            </ToggleButton>
          </Tooltip>
          
          <Tooltip title="Flood Fill">
            <ToggleButton value={TOOL_FILL} aria-label="flood fill">
              <FormatColorFillIcon />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        
        {showFillOption && (
          <FormControlLabel
            control={
              <Checkbox
                checked={options.fill}
                onChange={handleFillToggle}
                color="primary"
              />
            }
            label="Fill Shape"
          />
        )}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={options.fillColor !== undefined ? options.fillColor : true}
              onChange={handleFillColorToggle}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InvertColorsIcon sx={{ mr: 0.5 }} /> 
              {options.fillColor !== undefined ? 
                (options.fillColor ? "White" : "Black") : 
                "White"}
            </Box>
          }
        />
      </Box>
      
      <Typography variant="body2" sx={{ mt: 1 }}>
        {tool === TOOL_PIXEL && 'Click to toggle individual pixels'}
        {tool === TOOL_FREEHAND && 'Click and drag to draw freely'}
        {tool === TOOL_LINE && 'Click and drag to draw a line'}
        {tool === TOOL_RECTANGLE && `Click and drag to draw a ${options.fill ? 'filled' : ''} rectangle`}
        {tool === TOOL_ROUNDED_RECTANGLE && `Click and drag to draw a ${options.fill ? 'filled' : ''} rounded rectangle`}
        {tool === TOOL_CIRCLE && `Click and drag to set the ${options.fill ? 'filled' : ''} circle center and radius`}
        {tool === TOOL_TRIANGLE && `Click to set the top vertex, then drag to set width and height of a ${options.fill ? 'filled' : ''} triangle`}
        {tool === TOOL_FILL && 'Click to fill connected areas of the same color'}
      </Typography>
    </Paper>
  );
};

export default DrawingTools; 