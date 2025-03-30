import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { 
  togglePixel, 
  startDrawing, 
  endDrawing, 
  cancelDrawing, 
  updateDrawingPreview,
  floodFill
} from '../../redux/oledSlice';
import { setFramePixels } from '../../redux/animationSlice';
import { 
  OLED_WIDTH, 
  OLED_HEIGHT, 
  PIXEL_SIZE, 
  COLOR_ON, 
  COLOR_OFF,
  TOOL_PIXEL,
  TOOL_LINE,
  TOOL_RECTANGLE,
  TOOL_CIRCLE,
  TOOL_ROUNDED_RECTANGLE,
  TOOL_TRIANGLE,
  TOOL_FILL,
  TOOL_FREEHAND
} from '../../utils/CONSTANTS';
import styles from './OLEDGrid.module.css';

// Helper functions to calculate preview elements
const calculateLinePoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
  const points: { x: number, y: number }[] = [];
  
  // Bresenham's algorithm
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let x = x1;
  let y = y1;
  
  while (true) {
    if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
      points.push({ x, y });
    }
    
    if (x === x2 && y === y2) break;
    
    const e2 = 2 * err;
    if (e2 >= dy) {
      if (x === x2) break;
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      if (y === y2) break;
      err += dx;
      y += sy;
    }
  }
  
  return points;
};

const calculateRectanglePoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
  const points: { x: number, y: number }[] = [];
  
  // Ensure x1,y1 is top-left and x2,y2 is bottom-right
  const startX = Math.min(x1, x2);
  const startY = Math.min(y1, y2);
  const endX = Math.max(x1, x2);
  const endY = Math.max(y1, y2);
  
  // Top and bottom lines
  for (let x = startX; x <= endX; x++) {
    if (x >= 0 && x < OLED_WIDTH && startY >= 0 && startY < OLED_HEIGHT) {
      points.push({ x, y: startY });
    }
    if (x >= 0 && x < OLED_WIDTH && endY >= 0 && endY < OLED_HEIGHT && endY !== startY) {
      points.push({ x, y: endY });
    }
  }
  
  // Left and right lines (avoiding corners which are already added)
  for (let y = startY + 1; y < endY; y++) {
    if (startX >= 0 && startX < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
      points.push({ x: startX, y });
    }
    if (endX >= 0 && endX < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT && endX !== startX) {
      points.push({ x: endX, y });
    }
  }
  
  return points;
};

const calculateCirclePoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
  const points: { x: number, y: number }[] = [];
  
  // Calculate radius based on the distance between the points
  const radius = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
  
  let x = radius;
  let y = 0;
  let err = 0;
  
  while (x >= y) {
    // Add 8 points (for 8 octants of the circle)
    if (x1 + x >= 0 && x1 + x < OLED_WIDTH && y1 + y >= 0 && y1 + y < OLED_HEIGHT) points.push({ x: x1 + x, y: y1 + y });
    if (x1 + y >= 0 && x1 + y < OLED_WIDTH && y1 + x >= 0 && y1 + x < OLED_HEIGHT) points.push({ x: x1 + y, y: y1 + x });
    if (x1 - y >= 0 && x1 - y < OLED_WIDTH && y1 + x >= 0 && y1 + x < OLED_HEIGHT) points.push({ x: x1 - y, y: y1 + x });
    if (x1 - x >= 0 && x1 - x < OLED_WIDTH && y1 + y >= 0 && y1 + y < OLED_HEIGHT) points.push({ x: x1 - x, y: y1 + y });
    if (x1 - x >= 0 && x1 - x < OLED_WIDTH && y1 - y >= 0 && y1 - y < OLED_HEIGHT) points.push({ x: x1 - x, y: y1 - y });
    if (x1 - y >= 0 && x1 - y < OLED_WIDTH && y1 - x >= 0 && y1 - x < OLED_HEIGHT) points.push({ x: x1 - y, y: y1 - x });
    if (x1 + y >= 0 && x1 + y < OLED_WIDTH && y1 - x >= 0 && y1 - x < OLED_HEIGHT) points.push({ x: x1 + y, y: y1 - x });
    if (x1 + x >= 0 && x1 + x < OLED_WIDTH && y1 - y >= 0 && y1 - y < OLED_HEIGHT) points.push({ x: x1 + x, y: y1 - y });
    
    y++;
    if (err <= 0) {
      err += 2 * y + 1;
    }
    if (err > 0) {
      x--;
      err -= 2 * x + 1;
    }
  }
  
  return points;
};

// Add new function to calculate triangle points
const calculateTrianglePoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
  const points: { x: number, y: number }[] = [];
  
  // First point at the starting position (top vertex)
  const topX = x1;
  const topY = y1;
  
  // Calculate bottom-left and bottom-right points based on cursor position
  const width = Math.abs(x2 - x1) * 2; // Make triangle width proportional
  const height = y2 - y1;
  
  // Only generate triangle if height is positive
  if (height <= 0) {
    return [];
  }
  
  const bottomLeftX = Math.max(0, Math.floor(topX - width / 2));
  const bottomLeftY = Math.min(OLED_HEIGHT - 1, topY + height);
  
  const bottomRightX = Math.min(OLED_WIDTH - 1, Math.floor(topX + width / 2));
  const bottomRightY = bottomLeftY;
  
  // Use more accurate line drawing algorithm to ensure all pixels are included
  const line1 = calculateLinePoints(topX, topY, bottomLeftX, bottomLeftY);
  const line2 = calculateLinePoints(bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
  const line3 = calculateLinePoints(bottomRightX, bottomRightY, topX, topY);
  
  // Add all line points without duplicates
  const addedPoints = new Set<string>();
  
  // Helper to add points without duplicates
  const addPoint = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (!addedPoints.has(key)) {
      addedPoints.add(key);
      points.push({ x, y });
    }
  };
  
  // Add all points from all three lines
  line1.forEach(p => addPoint(p.x, p.y));
  line2.forEach(p => addPoint(p.x, p.y));
  line3.forEach(p => addPoint(p.x, p.y));
  
  return points;
};

// Add new function to calculate rounded rectangle points
const calculateRoundedRectPoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
  const points: { x: number, y: number }[] = [];
  
  // Ensure x1,y1 is top-left and x2,y2 is bottom-right
  const startX = Math.min(x1, x2);
  const startY = Math.min(y1, y2);
  const endX = Math.max(x1, x2);
  const endY = Math.max(y1, y2);
  
  const width = endX - startX;
  const height = endY - startY;
  
  // Calculate corner radius (proportional to the smaller dimension, max 5px)
  const cornerRadius = Math.min(5, Math.floor(Math.min(width, height) / 4));
  
  if (cornerRadius <= 1) {
    // If corners are too small, just draw normal rectangle
    return calculateRectanglePoints(x1, y1, x2, y2);
  }
  
  // Draw the horizontal lines (excluding corners)
  for (let x = startX + cornerRadius; x <= endX - cornerRadius; x++) {
    if (x >= 0 && x < OLED_WIDTH) {
      if (startY >= 0 && startY < OLED_HEIGHT) points.push({ x, y: startY });
      if (endY >= 0 && endY < OLED_HEIGHT) points.push({ x, y: endY });
    }
  }
  
  // Draw the vertical lines (excluding corners)
  for (let y = startY + cornerRadius; y <= endY - cornerRadius; y++) {
    if (y >= 0 && y < OLED_HEIGHT) {
      if (startX >= 0 && startX < OLED_WIDTH) points.push({ x: startX, y });
      if (endX >= 0 && endX < OLED_WIDTH) points.push({ x: endX, y });
    }
  }
  
  // Draw the four corner arcs
  // Top-left corner
  drawCornerArc(points, startX + cornerRadius, startY + cornerRadius, cornerRadius, 180, 270);
  // Top-right corner
  drawCornerArc(points, endX - cornerRadius, startY + cornerRadius, cornerRadius, 270, 360);
  // Bottom-right corner
  drawCornerArc(points, endX - cornerRadius, endY - cornerRadius, cornerRadius, 0, 90);
  // Bottom-left corner
  drawCornerArc(points, startX + cornerRadius, endY - cornerRadius, cornerRadius, 90, 180);
  
  return points;
};

// Helper function to draw a corner arc
const drawCornerArc = (
  points: { x: number, y: number }[],
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  // Convert angles to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Calculate number of points based on radius
  const step = Math.PI / (6 * radius); // adjust step for smoother arc with larger radius
  
  for (let theta = startRad; theta <= endRad; theta += step) {
    const x = Math.round(centerX + radius * Math.cos(theta));
    const y = Math.round(centerY + radius * Math.sin(theta));
    
    if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
      points.push({ x, y });
    }
  }
};

const OLEDGrid: React.FC = () => {
  const dispatch = useDispatch();
  const { pixels, drawing } = useSelector((state: RootState) => state.oled);
  const { currentFrame } = useSelector((state: RootState) => state.animation);
  const { mode } = useSelector((state: RootState) => state.theme);
  const [hoverCoords, setHoverCoords] = useState<{ x: number, y: number } | null>(null);

  // Update animation frames when pixels change
  useEffect(() => {
    // Update the animation frame when pixels change
    dispatch(setFramePixels({ frameIndex: currentFrame, pixels }));
  }, [pixels, dispatch, currentFrame]);

  const handleMouseDown = (x: number, y: number) => {
    if (drawing.tool === TOOL_PIXEL) {
      dispatch(togglePixel({ x, y }));
      return;
    }
    
    if (drawing.tool === TOOL_FILL) {
      dispatch(floodFill({ x, y }));
      return;
    }
    
    // For all other drawing tools
    console.log(`Starting drawing at (${x},${y}) with tool ${drawing.tool}`);
    dispatch(startDrawing({ x, y }));
  };

  const handleMouseMove = (x: number, y: number) => {    
    // For drawing tools, update the preview if we're in drawing mode
    if (drawing.isDrawing && ![TOOL_PIXEL, TOOL_FILL].includes(drawing.tool)) {
      console.log(`Drawing preview at (${x},${y})`);
      dispatch(updateDrawingPreview({ x, y }));
    }
  };

  const handleMouseUp = (x: number, y: number) => {    
    if (drawing.isDrawing && ![TOOL_PIXEL, TOOL_FILL].includes(drawing.tool)) {
      console.log(`Finishing drawing at (${x},${y})`);
      dispatch(endDrawing({ x, y }));
    }
  };

  // Handle canceling the drawing if mouse leaves the grid
  const handleMouseLeave = () => {
    setHoverCoords(null);
    
    if (drawing.isDrawing) {
      dispatch(cancelDrawing());
    }
  };

  // Handle canceling the drawing if the Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawing.isDrawing) {
          dispatch(cancelDrawing());
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, drawing.isDrawing]);

  // Get preview pixels based on current drawing state
  const getPreviewPoints = () => {
    let points: { x: number, y: number }[] = [];
    
    // For regular drawing tools preview
    if (drawing.isDrawing && drawing.startX !== null && drawing.startY !== null && drawing.endX !== null && drawing.endY !== null) {
      // Calculate preview based on the selected drawing tool
      console.log(`Drawing with tool: ${drawing.tool}, from (${drawing.startX},${drawing.startY}) to (${drawing.endX},${drawing.endY})`);
      
      switch (drawing.tool) {
        case TOOL_LINE:
          points = calculateLinePoints(drawing.startX, drawing.startY, drawing.endX, drawing.endY);
          break;
        case TOOL_RECTANGLE:
          points = calculateRectanglePoints(drawing.startX, drawing.startY, drawing.endX, drawing.endY);
          break;
        case TOOL_CIRCLE:
          points = calculateCirclePoints(drawing.startX, drawing.startY, drawing.endX, drawing.endY);
          break;
        case TOOL_ROUNDED_RECTANGLE:
          points = calculateRoundedRectPoints(drawing.startX, drawing.startY, drawing.endX, drawing.endY);
          break;
        case TOOL_TRIANGLE:
          points = calculateTrianglePoints(drawing.startX, drawing.startY, drawing.endX, drawing.endY);
          break;
      }
      
      if (points.length === 0) {
        // If no points were calculated, at least show the current point
        points.push({ x: drawing.endX, y: drawing.endY });
      }
    } 
    // Use existing preview pixels (for freehand drawing)
    else if (drawing.previewPixels) {
      // Use existing preview pixels
      for (let y = 0; y < OLED_HEIGHT; y++) {
        for (let x = 0; x < OLED_WIDTH; x++) {
          if (drawing.previewPixels[y][x]) {
            points.push({ x, y });
          }
        }
      }
    }
    
    console.log(`Preview points calculated: ${points.length}`);
    return points;
  };
  
  const previewPoints = getPreviewPoints();

  return (
    <Paper 
      elevation={3} 
      className={styles.gridContainer}
      sx={{
        backgroundColor: COLOR_OFF,
        padding: '16px',
        borderRadius: 2
      }}
    >
      <Box className={styles.gridHeader}>
        <Typography variant="h6" color="#ffffff" sx={{ fontWeight: 'bold' }}>
          OLED Display (128×64)
        </Typography>
        {hoverCoords ? (
          <Typography variant="body2" color="#ffffff">
            Position: X={hoverCoords.x}, Y={hoverCoords.y}
          </Typography>
        ) : (
          <Typography variant="body2" color="#ffffff">
            Position: X=-, Y=-
          </Typography>
        )}
      </Box>
      <Box 
        className={styles.gridWrapper}
        sx={{ backgroundColor: COLOR_OFF }}
      >
        <div 
          className={styles.grid}
          onMouseLeave={handleMouseLeave}
        >
          {Array.from({ length: OLED_HEIGHT }).map((_, y) => (
            <div key={y} className={styles['grid-row']}>
              {Array.from({ length: OLED_WIDTH }).map((_, x) => {
                const isPreview = previewPoints.some(p => p.x === x && p.y === y);
                
                // Define styles dynamically
                let backgroundColor = pixels[y][x] ? COLOR_ON : COLOR_OFF;
                let borderColor = mode === 'dark' ? '#111' : '#ddd';
                let zIndex = 1;
                
                // Add styles based on pixel type
                if (isPreview) {
                  // Preview for regular drawing tools - make very visible
                  backgroundColor = 'rgba(128, 128, 255, 0.9)';
                  borderColor = '#5555ff';
                  zIndex = 5;
                }
                
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      width: `${PIXEL_SIZE}px`,
                      height: `${PIXEL_SIZE}px`,
                      backgroundColor,
                      borderColor,
                      zIndex,
                      border: `0.1px solid ${borderColor}`,
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown(x, y);
                    }}
                    onMouseOver={(e) => {
                      if (e.buttons === 1) { // Left mouse button is pressed
                        e.preventDefault();
                        handleMouseMove(x, y);
                      } else {
                        setHoverCoords({ x, y });
                      }
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      handleMouseUp(x, y);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Box>
    </Paper>
  );
};

export default OLEDGrid; 