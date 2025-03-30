import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createEmptyPixelArray } from '../utils/reusableFns';
import { 
  OLED_WIDTH, 
  OLED_HEIGHT, 
  TOOL_PIXEL, 
  TOOL_LINE, 
  TOOL_RECTANGLE, 
  TOOL_CIRCLE, 
  TOOL_FILL, 
  TOOL_ROUNDED_RECTANGLE, 
  TOOL_TRIANGLE, 
  TOOL_FREEHAND
} from '../utils/CONSTANTS';

// Type for saved designs
export interface SavedDesign {
  id: string;
  name: string;
  pixels: boolean[][];
  createdAt: string;
}

// Define types for drawing operations
export type DrawingOperation = {
  type: string;
  params: any;
};

// Type for drawing state
interface DrawingToolOptions {
  fill?: boolean;
  fillColor?: boolean; // true for black, false for white
}

// Update the drawing state to include options
interface DrawingState {
  tool: string;
  isDrawing: boolean;
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  previewPixels: boolean[][] | null;
  options: DrawingToolOptions;
  lastPoint: { x: number, y: number } | null; // Add this for freehand drawing
}

// State type definition
interface OLEDState {
  pixels: boolean[][];
  history: boolean[][][];
  historyIndex: number;
  savedDesigns: SavedDesign[];
  currentDesignName: string;
  drawing: DrawingState;
  drawingOperations: DrawingOperation[]; // Add this to track operations
}

// Try to load saved designs from localStorage
const loadSavedDesigns = (): SavedDesign[] => {
  try {
    const savedDesigns = localStorage.getItem('oledDesigns');
    return savedDesigns ? JSON.parse(savedDesigns) : [];
  } catch (error) {
    console.error('Failed to load designs from localStorage:', error);
    return [];
  }
};

const initialState: OLEDState = {
  pixels: createEmptyPixelArray(OLED_WIDTH, OLED_HEIGHT),
  history: [createEmptyPixelArray(OLED_WIDTH, OLED_HEIGHT)],
  historyIndex: 0,
  savedDesigns: loadSavedDesigns(),
  currentDesignName: 'Untitled Design',
  drawing: {
    tool: TOOL_PIXEL,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
    previewPixels: null,
    isDrawing: false,
    options: {
      fill: false,
      fillColor: true // Default to black fill
    },
    lastPoint: null
  },
  drawingOperations: []
};

// Helper function to draw a line using Bresenham's algorithm
const drawLine = (
  pixels: boolean[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: boolean
): boolean[][] => {
  const newPixels = pixels.map(row => [...row]);
  
  // Bresenham's line algorithm
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  
  while (true) {
    if (x0 >= 0 && x0 < OLED_WIDTH && y0 >= 0 && y0 < OLED_HEIGHT) {
      newPixels[y0][x0] = value;
    }
    
    if (x0 === x1 && y0 === y1) break;
    
    const e2 = 2 * err;
    if (e2 >= dy) {
      if (x0 === x1) break;
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      if (y0 === y1) break;
      err += dx;
      y0 += sy;
    }
  }
  
  return newPixels;
};

// Helper function to draw a rectangle
const drawRectangle = (
  pixels: boolean[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: boolean
): boolean[][] => {
  const newPixels = pixels.map(row => [...row]);
  
  // Ensure x0,y0 is top-left and x1,y1 is bottom-right
  const startX = Math.min(x0, x1);
  const startY = Math.min(y0, y1);
  const endX = Math.max(x0, x1);
  const endY = Math.max(y0, y1);
  
  // Draw the rectangle
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
        // Only draw the outline
        if (y === startY || y === endY || x === startX || x === endX) {
          newPixels[y][x] = value;
        }
      }
    }
  }
  
  return newPixels;
};

// Helper function to draw a circle using midpoint circle algorithm
const drawCircle = (
  pixels: boolean[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: boolean
): boolean[][] => {
  const newPixels = pixels.map(row => [...row]);
  
  // Calculate radius based on the distance between the points
  const radius = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
  
  let x = radius;
  let y = 0;
  let err = 0;
  
  while (x >= y) {
    // Draw 8 points (for 8 octants of the circle)
    if (x0 + x >= 0 && x0 + x < OLED_WIDTH && y0 + y >= 0 && y0 + y < OLED_HEIGHT) newPixels[y0 + y][x0 + x] = value;
    if (x0 + y >= 0 && x0 + y < OLED_WIDTH && y0 + x >= 0 && y0 + x < OLED_HEIGHT) newPixels[y0 + x][x0 + y] = value;
    if (x0 - y >= 0 && x0 - y < OLED_WIDTH && y0 + x >= 0 && y0 + x < OLED_HEIGHT) newPixels[y0 + x][x0 - y] = value;
    if (x0 - x >= 0 && x0 - x < OLED_WIDTH && y0 + y >= 0 && y0 + y < OLED_HEIGHT) newPixels[y0 + y][x0 - x] = value;
    if (x0 - x >= 0 && x0 - x < OLED_WIDTH && y0 - y >= 0 && y0 - y < OLED_HEIGHT) newPixels[y0 - y][x0 - x] = value;
    if (x0 - y >= 0 && x0 - y < OLED_WIDTH && y0 - x >= 0 && y0 - x < OLED_HEIGHT) newPixels[y0 - x][x0 - y] = value;
    if (x0 + y >= 0 && x0 + y < OLED_WIDTH && y0 - x >= 0 && y0 - x < OLED_HEIGHT) newPixels[y0 - x][x0 + y] = value;
    if (x0 + x >= 0 && x0 + x < OLED_WIDTH && y0 - y >= 0 && y0 - y < OLED_HEIGHT) newPixels[y0 - y][x0 + x] = value;
    
    y++;
    if (err <= 0) {
      err += 2 * y + 1;
    }
    if (err > 0) {
      x--;
      err -= 2 * x + 1;
    }
  }
  
  return newPixels;
};

// Helper function for flood fill using queue-based approach
const floodFillHelper = (
  pixels: boolean[][],
  x: number,
  y: number,
  targetValue: boolean,
  replacementValue: boolean
): boolean[][] => {
  // If the target is already the replacement value, or out of bounds, return
  if (
    x < 0 || x >= OLED_WIDTH || 
    y < 0 || y >= OLED_HEIGHT || 
    pixels[y][x] !== targetValue || 
    targetValue === replacementValue
  ) {
    return pixels;
  }
  
  const newPixels = pixels.map(row => [...row]);
  const queue: [number, number][] = [[x, y]];
  
  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift()!;
    
    // Check if this pixel is the target value
    if (
      currentX < 0 || currentX >= OLED_WIDTH || 
      currentY < 0 || currentY >= OLED_HEIGHT || 
      newPixels[currentY][currentX] !== targetValue
    ) {
      continue;
    }
    
    // Set the pixel to the replacement value
    newPixels[currentY][currentX] = replacementValue;
    
    // Add the 4-connected neighbors to the queue
    queue.push([currentX + 1, currentY]); // right
    queue.push([currentX - 1, currentY]); // left
    queue.push([currentX, currentY + 1]); // down
    queue.push([currentX, currentY - 1]); // up
  }
  
  return newPixels;
};

// Helper function to add to history
const addToHistory = (state: OLEDState) => {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(state.pixels.map(row => [...row]));
  
  state.history = newHistory;
  state.historyIndex = newHistory.length - 1;
};

// Modified oledSlice definition with animation reducers
const oledSlice = createSlice({
  name: 'oled',
  initialState,
  reducers: {
    togglePixel: (state, action: PayloadAction<{ x: number; y: number }>) => {
      const { x, y } = action.payload;
      
      // Check bounds
      if (x < 0 || x >= OLED_WIDTH || y < 0 || y >= OLED_HEIGHT) {
        return;
      }
      
      // If in pixel tool mode, set to current fillColor instead of toggling
      if (state.drawing.tool === TOOL_PIXEL) {
        const fillValue = state.drawing.options.fillColor !== undefined 
          ? state.drawing.options.fillColor 
          : !state.pixels[y][x]; // Default to toggling if fillColor not set
          
        const newPixels = state.pixels.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((pixel, colIndex) =>
                colIndex === x ? fillValue : pixel
              )
            : [...row]
        );
        
        state.pixels = newPixels;
        
        // Add to history
        addToHistory(state);
        
        // Add drawing operation
        state.drawingOperations.push({
          type: 'PIXEL',
          params: { x, y, value: fillValue }
        });
      } else {
        // For other tools, keep the toggle behavior
        const newPixels = state.pixels.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((pixel, colIndex) =>
                colIndex === x ? !pixel : pixel
              )
            : [...row]
        );
        
        state.pixels = newPixels;
        
        // Add to history
        addToHistory(state);
        
        // Add drawing operation
        state.drawingOperations.push({
          type: 'PIXEL',
          params: { x, y, value: newPixels[y][x] }
        });
      }
    },
    
    clearGrid: (state) => {
      state.pixels = createEmptyPixelArray(OLED_WIDTH, OLED_HEIGHT);
      
      // Add to history
      addToHistory(state);
      
      // Clear drawing operations
      state.drawingOperations = [];
    },
    
    fillGrid: (state) => {
      state.pixels = Array(OLED_HEIGHT)
        .fill(null)
        .map(() => Array(OLED_WIDTH).fill(true));
      
      // Add to history
      addToHistory(state);
      
      // Add drawing operation
      state.drawingOperations.push({
        type: 'FILL_ALL',
        params: {}
      });
    },
    
    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.pixels = state.history[state.historyIndex].map(row => [...row]);
        
        // Remove the last drawing operation
        if (state.drawingOperations.length > 0) {
          state.drawingOperations.pop();
        }
      }
    },
    
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        state.pixels = state.history[state.historyIndex].map(row => [...row]);
      }
    },

    // New actions for saving and loading designs
    setCurrentDesignName: (state, action: PayloadAction<string>) => {
      state.currentDesignName = action.payload;
    },
    
    saveDesign: (state) => {
      const newDesign: SavedDesign = {
        id: Date.now().toString(),
        name: state.currentDesignName,
        pixels: state.pixels.map(row => [...row]),
        createdAt: new Date().toISOString(),
      };
      
      // Add to saved designs
      state.savedDesigns = [...state.savedDesigns, newDesign];
      
      // Save to localStorage
      try {
        localStorage.setItem('oledDesigns', JSON.stringify(state.savedDesigns));
      } catch (error) {
        console.error('Failed to save designs to localStorage:', error);
      }
    },
    
    loadDesign: (state, action: PayloadAction<string>) => {
      const designId = action.payload;
      const design = state.savedDesigns.find(d => d.id === designId);
      
      if (design) {
        const loadedPixels = design.pixels.map(row => [...row]);
        
        // Add to history
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(loadedPixels);
        
        state.pixels = loadedPixels;
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
        state.currentDesignName = design.name;
      }
    },
    
    deleteDesign: (state, action: PayloadAction<string>) => {
      const designId = action.payload;
      state.savedDesigns = state.savedDesigns.filter(d => d.id !== designId);
      
      // Update localStorage
      try {
        localStorage.setItem('oledDesigns', JSON.stringify(state.savedDesigns));
      } catch (error) {
        console.error('Failed to update localStorage after design deletion:', error);
      }
    },

    // Drawing tool actions
    setTool: (state, action: PayloadAction<string>) => {
      state.drawing.tool = action.payload;
    },
    
    // Set drawing tool options
    setFillOption: (state, action: PayloadAction<DrawingToolOptions>) => {
      state.drawing.options = {
        ...state.drawing.options,
        ...action.payload
      };
    },
    
    // Drawing tool reducers
    startDrawing: (state, action: PayloadAction<{ x: number; y: number }>) => {
      const { x, y } = action.payload;
      
      // Set the start coordinates
      state.drawing.startX = x;
      state.drawing.startY = y;
      
      // Initialize end coordinates to match start
      // This allows tools to draw immediately as the user moves
      state.drawing.endX = x;
      state.drawing.endY = y;
      
      // Set drawing state
      state.drawing.isDrawing = true;
      state.drawing.previewPixels = null;
      state.drawing.lastPoint = { x, y };
      
      // For freehand drawing, start drawing immediately
      if (state.drawing.tool === TOOL_FREEHAND) {
        // Get the fill color value
        const fillValue = state.drawing.options.fillColor !== undefined 
          ? state.drawing.options.fillColor 
          : true;
          
        // Set the starting pixel
        const newPixels = state.pixels.map(row => [...row]);
        if (y >= 0 && y < OLED_HEIGHT && 
            x >= 0 && x < OLED_WIDTH) {
          newPixels[y][x] = fillValue;
        }
        state.pixels = newPixels;
      }
      
      console.log(`Drawing started at (${x},${y}) with tool ${state.drawing.tool}`);
    },
    
    endDrawing: (state, action: PayloadAction<{ x: number; y: number }>) => {
      const { x, y } = action.payload;
      const { startX, startY, tool, options, lastPoint } = state.drawing;
      
      if (!startX || !startY || !tool) return;
      
      // Create a new pixels array to ensure immutability
      let newPixels = JSON.parse(JSON.stringify(state.pixels));
      // Get the fill color value - default to true (black) if not specified
      const fillValue = options.fillColor !== undefined ? options.fillColor : true;
      
      // Apply the drawing based on the selected tool
      switch (tool) {
        case TOOL_PIXEL:
          // Handled by togglePixel
          break;
          
        case TOOL_FREEHAND:
          // Freehand drawing is already updated in real-time during updateDrawingPreview
          // Record the final segment if needed
          if (lastPoint && (lastPoint.x !== x || lastPoint.y !== y)) {
            newPixels = drawLine(newPixels, lastPoint.x, lastPoint.y, x, y, fillValue);
            
            state.drawingOperations.push({
              type: 'FREEHAND_SEGMENT',
              params: { x1: lastPoint.x, y1: lastPoint.y, x2: x, y2: y, value: fillValue }
            });
          }
          
          // Add a complete operation for the entire freehand path
          state.drawingOperations.push({
            type: 'FREEHAND_COMPLETE',
            params: { startX, startY, endX: x, endY: y, value: fillValue }
          });
          break;
          
        case TOOL_LINE:
          // Draw a line from startPoint to action.payload
          newPixels = drawLine(newPixels, startX, startY, x, y, fillValue);
          // Record drawing operation
          state.drawingOperations.push({
            type: 'LINE',
            params: { x1: startX, y1: startY, x2: x, y2: y, value: fillValue }
          });
          break;
          
        case TOOL_RECTANGLE:
          const [left, top] = [
            Math.min(startX, x),
            Math.min(startY, y)
          ];
          const [right, bottom] = [
            Math.max(startX, x),
            Math.max(startY, y)
          ];
          
          if (options.fill) {
            // Draw filled rectangle
            newPixels = drawFilledRectangle(newPixels, left, top, right - left + 1, bottom - top + 1, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'FILLED_RECTANGLE',
              params: { x: left, y: top, width: right - left + 1, height: bottom - top + 1, value: fillValue }
            });
          } else {
            // Draw outlined rectangle
            newPixels = drawRectangle(newPixels, left, top, right, bottom, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'RECTANGLE',
              params: { x: left, y: top, width: right - left + 1, height: bottom - top + 1, value: fillValue }
            });
          }
          break;
          
        case TOOL_CIRCLE:
          const radius = Math.round(
            Math.sqrt(
              Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
            )
          );
          
          if (options.fill) {
            // Draw filled circle
            newPixels = drawFilledCircle(newPixels, startX, startY, radius, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'FILLED_CIRCLE',
              params: { x: startX, y: startY, radius, value: fillValue }
            });
          } else {
            // Draw outlined circle
            newPixels = drawCircle(newPixels, startX, startY, startX + radius, startY, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'CIRCLE',
              params: { x: startX, y: startY, radius, value: fillValue }
            });
          }
          break;
          
        case TOOL_ROUNDED_RECTANGLE:
          const [rLeft, rTop] = [
            Math.min(startX, x),
            Math.min(startY, y)
          ];
          const rWidth = Math.abs(x - startX) + 1;
          const rHeight = Math.abs(y - startY) + 1;
          
          // Draw the rounded rectangle
          newPixels = drawRoundedRectangle(newPixels, rLeft, rTop, rWidth, rHeight, options.fill, fillValue);
          // Record drawing operation
          state.drawingOperations.push({
            type: options.fill ? 'FILLED_ROUNDED_RECTANGLE' : 'ROUNDED_RECTANGLE',
            params: { x: rLeft, y: rTop, width: rWidth, height: rHeight, value: fillValue }
          });
          break;
          
        case TOOL_TRIANGLE:
          // Calculate triangle dimensions
          const tWidth = Math.abs(x - startX) * 2; // Make triangle width proportional
          const tHeight = y - startY;
          
          // Calculate the three points of the triangle
          const p1 = { x: startX, y: startY }; // Top vertex
          const p2 = { x: Math.max(0, Math.floor(startX - tWidth / 2)), y: Math.min(OLED_HEIGHT - 1, startY + tHeight) }; // Bottom left
          const p3 = { x: Math.min(OLED_WIDTH - 1, Math.floor(startX + tWidth / 2)), y: p2.y }; // Bottom right
          
          if (options.fill) {
            // Draw filled triangle
            newPixels = drawTriangle(newPixels, startX, startY, tWidth, tHeight, true, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'FILLED_TRIANGLE',
              params: { topX: startX, topY: startY, width: tWidth, height: tHeight, value: fillValue }
            });
          } else {
            // Draw the triangle outline
            newPixels = drawTriangle(newPixels, startX, startY, tWidth, tHeight, false, fillValue);
            // Record drawing operation
            state.drawingOperations.push({
              type: 'TRIANGLE',
              params: { topX: startX, topY: startY, width: tWidth, height: tHeight, value: fillValue }
            });
          }
          break;
          
        default:
          break;
      }
      
      // Update the pixels with a new reference to trigger re-render
      state.pixels = newPixels;
      
      // Reset drawing state
      state.drawing.isDrawing = false;
      state.drawing.startX = null;
      state.drawing.startY = null;
      state.drawing.endX = null;
      state.drawing.endY = null;
      state.drawing.previewPixels = null;
      state.drawing.lastPoint = null;
      
      // Add to history
      addToHistory(state);
    },
    
    cancelDrawing: (state) => {
      state.drawing.startX = null;
      state.drawing.startY = null;
      state.drawing.endX = null;
      state.drawing.endY = null;
      state.drawing.isDrawing = false;
      state.drawing.previewPixels = null;
      state.drawing.lastPoint = null;
    },
    
    updateDrawingPreview: (state, action: PayloadAction<{ x: number; y: number }>) => {
      const { x, y } = action.payload;
      state.drawing.endX = x;
      state.drawing.endY = y;
      
      // For freehand drawing, update pixels in real-time
      if (state.drawing.tool === TOOL_FREEHAND && state.drawing.isDrawing && state.drawing.lastPoint) {
        const lastPoint = state.drawing.lastPoint;
        // Create a new pixels array to ensure immutability
        const newPixels = JSON.parse(JSON.stringify(state.pixels));
        
        // Get the fill color value
        const fillValue = state.drawing.options.fillColor !== undefined 
          ? state.drawing.options.fillColor 
          : true;
        
        // Draw a line from the last point to the current point
        const updatedPixels = drawLine(newPixels, lastPoint.x, lastPoint.y, x, y, fillValue);
        
        // Update the pixels with a new reference to trigger re-render
        state.pixels = updatedPixels;
        
        // Update last point
        state.drawing.lastPoint = { x, y };
        
        // Record the drawing operation
        state.drawingOperations.push({
          type: 'FREEHAND_SEGMENT',
          params: { x1: lastPoint.x, y1: lastPoint.y, x2: x, y2: y, value: fillValue }
        });
      }
      // No need to create preview pixels for other tools - they're calculated in getPreviewPoints
    },
    
    // Flood fill action
    floodFill: (state, action: PayloadAction<{ x: number; y: number }>) => {
      const { x, y } = action.payload;
      
      // Check bounds
      if (x < 0 || x >= OLED_WIDTH || y < 0 || y >= OLED_HEIGHT) {
        return;
      }
      
      // Get the current pixel state
      const targetValue = state.pixels[y][x];
      
      // Get the fill color value
      const replacementValue = state.drawing.options.fillColor !== undefined 
        ? state.drawing.options.fillColor 
        : !targetValue; // Default behavior is to invert the target value
      
      // If the target pixel is already the replacement value, no need to fill
      if (targetValue === replacementValue) {
        return;
      }
      
      // Use the floodFillHelper function to get new pixels
      const newPixels = floodFillHelper(
        state.pixels,
        x,
        y,
        targetValue,
        replacementValue
      );
      
      state.pixels = newPixels;
      
      // Add to history
      addToHistory(state);
      
      // Add drawing operation
      state.drawingOperations.push({
        type: 'FLOOD_FILL',
        params: { x, y, targetValue, replacementValue }
      });
    },
    
    // Import image action
    importImage: (state, action: PayloadAction<boolean[][]>) => {
      const importedPixels = action.payload;
      
      // Validate the imported pixels dimensions
      if (importedPixels.length === OLED_HEIGHT && 
          importedPixels[0].length === OLED_WIDTH) {
        // Create a deep copy of the imported pixels
        state.pixels = importedPixels.map(row => [...row]);
        
        // Add to history
        addToHistory(state);
        
        // Add operation
        state.drawingOperations.push({
          type: 'IMPORT_IMAGE',
          params: {}
        });
        
        console.log('Image imported successfully');
      } else {
        console.error('Imported image has incorrect dimensions');
      }
    },
    
    // Clear drawing operations
    clearDrawingOperations: (state) => {
      state.drawingOperations = [];
      console.log('Drawing operations cleared');
    },

    // Add this new action to set pixels from an animation frame
    setPixelsFromFrame: (state, action: PayloadAction<boolean[][]>) => {
      const framePixels = action.payload;
      state.pixels = framePixels.map(row => [...row]);
      
      // Reset drawing state
      state.drawing.isDrawing = false;
      state.drawing.startX = null;
      state.drawing.startY = null;
      state.drawing.endX = null;
      state.drawing.endY = null;
      state.drawing.previewPixels = null;
      
      // Add to history
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      state.history.push(state.pixels.map(row => [...row]));
      state.historyIndex = state.history.length - 1;
    },
  },
});

// Export actions without animation-related actions
export const { 
  togglePixel, 
  clearGrid, 
  fillGrid, 
  undo, 
  redo, 
  setCurrentDesignName,
  saveDesign,
  loadDesign,
  deleteDesign,
  setTool,
  setFillOption,
  startDrawing,
  endDrawing,
  cancelDrawing,
  updateDrawingPreview,
  floodFill,
  importImage,
  clearDrawingOperations,
  setPixelsFromFrame
} = oledSlice.actions;

export default oledSlice.reducer;

// Define helper function for filled rectangle drawing
function drawFilledRectangle(
  pixels: boolean[][],
  left: number,
  top: number,
  width: number,
  height: number,
  value: boolean
): boolean[][] {
  // Fill the entire rectangle
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      if (y >= 0 && y < pixels.length && x >= 0 && x < pixels[0].length) {
        pixels[y][x] = value;
      }
    }
  }
  return pixels;
}

// Define helper function for filled circle drawing
function drawFilledCircle(
  pixels: boolean[][],
  centerX: number,
  centerY: number,
  radius: number,
  value: boolean
): boolean[][] {
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (y >= 0 && y < pixels.length && x >= 0 && x < pixels[0].length) {
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance <= radius) {
          pixels[y][x] = value;
        }
      }
    }
  }
  return pixels;
}

// Add helper function for triangle drawing at bottom of file
function drawTriangle(
  pixels: boolean[][],
  topX: number, 
  topY: number,
  width: number,
  height: number,
  fill: boolean = false,
  value: boolean = true
): boolean[][] {
  const newPixels = pixels.map(row => [...row]);
  
  // Only draw if height is positive
  if (height <= 0) {
    return newPixels;
  }
  
  // Calculate the three points of the triangle
  const p1 = { x: topX, y: topY }; // Top vertex
  const p2 = { x: Math.max(0, Math.floor(topX - width / 2)), y: Math.min(OLED_HEIGHT - 1, topY + height) }; // Bottom left
  const p3 = { x: Math.min(OLED_WIDTH - 1, Math.floor(topX + width / 2)), y: p2.y }; // Bottom right
  
  // If fill is true, fill the triangle
  if (fill) {
    // Simple scan-line triangle filling algorithm
    const minY = Math.max(0, Math.min(p1.y, p2.y, p3.y));
    const maxY = Math.min(OLED_HEIGHT - 1, Math.max(p1.y, p2.y, p3.y));
    
    for (let y = minY; y <= maxY; y++) {
      // Find the x-coordinates where this scanline intersects each edge of the triangle
      const intersections: number[] = [];
      
      // Check each edge of the triangle
      if ((p1.y <= y && p2.y > y) || (p1.y > y && p2.y <= y)) {
        // Edge from p1 to p2
        intersections.push(p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y));
      }
      
      if ((p2.y <= y && p3.y > y) || (p2.y > y && p3.y <= y)) {
        // Edge from p2 to p3
        intersections.push(p2.x + (y - p2.y) * (p3.x - p2.x) / (p3.y - p2.y));
      }
      
      if ((p3.y <= y && p1.y > y) || (p3.y > y && p1.y <= y)) {
        // Edge from p3 to p1
        intersections.push(p3.x + (y - p3.y) * (p1.x - p3.x) / (p1.y - p3.y));
      }
      
      // Sort the intersections
      intersections.sort((a, b) => a - b);
      
      // Fill between pairs of intersections
      for (let i = 0; i < intersections.length; i += 2) {
        if (i + 1 < intersections.length) {
          const startX = Math.max(0, Math.round(intersections[i]));
          const endX = Math.min(OLED_WIDTH - 1, Math.round(intersections[i + 1]));
          
          for (let x = startX; x <= endX; x++) {
            newPixels[y][x] = value;
          }
        }
      }
    }
  } else {
    // Draw the outline only using lines
    // Ensure each pixel is set exactly once by using a Set to track visited points
    const visited = new Set<string>();
    
    // Helper function to safely set a pixel only once
    const safeSetPixel = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (!visited.has(key) && x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
        visited.add(key);
        newPixels[y][x] = value;
      }
    };
    
    // Line from p1 to p2 (improved Bresenham's algorithm)
    drawLineWithSafePixels(safeSetPixel, p1.x, p1.y, p2.x, p2.y);
    
    // Line from p2 to p3
    drawLineWithSafePixels(safeSetPixel, p2.x, p2.y, p3.x, p3.y);
    
    // Line from p3 to p1
    drawLineWithSafePixels(safeSetPixel, p3.x, p3.y, p1.x, p1.y);
  }
  
  return newPixels;
}

// Helper function to draw a line with a custom pixel setter
function drawLineWithSafePixels(
  setPixel: (x: number, y: number) => void,
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): void {
  // Bresenham's algorithm for more precise line drawing
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  
  let x = x1;
  let y = y1;
  
  while (true) {
    setPixel(x, y);
    
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
}

// Add helper function for rounded rectangle drawing
function drawRoundedRectangle(
  pixels: boolean[][],
  left: number,
  top: number,
  width: number,
  height: number,
  fill: boolean = false,
  value: boolean = true
): boolean[][] {
  const newPixels = pixels.map(row => [...row]);
  
  // Calculate corner radius (proportional to the smaller dimension, max 5px)
  const cornerRadius = Math.min(5, Math.floor(Math.min(width, height) / 4));
  
  if (cornerRadius <= 1) {
    // If corners are too small, just draw normal rectangle
    return fill 
      ? drawFilledRectangle(newPixels, left, top, width, height, value) 
      : drawRectangle(newPixels, left, top, left + width - 1, top + height - 1, value);
  }
  
  const right = left + width - 1;
  const bottom = top + height - 1;
  
  if (fill) {
    // For filled rounded rectangle, we can use the fill rectangle and then round the corners
    drawFilledRectangle(newPixels, left, top, width, height, value);
    
    // Erase the corners to make them rounded
    // Top-left corner
    for (let y = top; y < top + cornerRadius; y++) {
      for (let x = left; x < left + cornerRadius; x++) {
        const dx = x - (left + cornerRadius);
        const dy = y - (top + cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
            newPixels[y][x] = false;
          }
        }
      }
    }
    
    // Top-right corner
    for (let y = top; y < top + cornerRadius; y++) {
      for (let x = right - cornerRadius + 1; x <= right; x++) {
        const dx = x - (right - cornerRadius);
        const dy = y - (top + cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
            newPixels[y][x] = false;
          }
        }
      }
    }
    
    // Bottom-right corner
    for (let y = bottom - cornerRadius + 1; y <= bottom; y++) {
      for (let x = right - cornerRadius + 1; x <= right; x++) {
        const dx = x - (right - cornerRadius);
        const dy = y - (bottom - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
            newPixels[y][x] = false;
          }
        }
      }
    }
    
    // Bottom-left corner
    for (let y = bottom - cornerRadius + 1; y <= bottom; y++) {
      for (let x = left; x < left + cornerRadius; x++) {
        const dx = x - (left + cornerRadius);
        const dy = y - (bottom - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
            newPixels[y][x] = false;
          }
        }
      }
    }
  } else {
    // Draw the horizontal lines (excluding corners)
    for (let x = left + cornerRadius; x <= right - cornerRadius; x++) {
      if (x >= 0 && x < OLED_WIDTH) {
        if (top >= 0 && top < OLED_HEIGHT) newPixels[top][x] = value;
        if (bottom >= 0 && bottom < OLED_HEIGHT) newPixels[bottom][x] = value;
      }
    }
    
    // Draw the vertical lines (excluding corners)
    for (let y = top + cornerRadius; y <= bottom - cornerRadius; y++) {
      if (y >= 0 && y < OLED_HEIGHT) {
        if (left >= 0 && left < OLED_WIDTH) newPixels[y][left] = value;
        if (right >= 0 && right < OLED_WIDTH) newPixels[y][right] = value;
      }
    }
    
    // Draw the four corner arcs
    drawCornerArc(newPixels, left + cornerRadius, top + cornerRadius, cornerRadius, 180, 270, value);
    drawCornerArc(newPixels, right - cornerRadius, top + cornerRadius, cornerRadius, 270, 360, value);
    drawCornerArc(newPixels, right - cornerRadius, bottom - cornerRadius, cornerRadius, 0, 90, value);
    drawCornerArc(newPixels, left + cornerRadius, bottom - cornerRadius, cornerRadius, 90, 180, value);
  }
  
  return newPixels;
}

// Helper function to draw a corner arc
function drawCornerArc(
  pixels: boolean[][],
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  value: boolean
): boolean[][] {
  // Convert angles to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Calculate number of points based on radius
  const step = Math.PI / (6 * radius); // adjust step for smoother arc with larger radius
  
  for (let theta = startRad; theta <= endRad; theta += step) {
    const x = Math.round(centerX + radius * Math.cos(theta));
    const y = Math.round(centerY + radius * Math.sin(theta));
    
    if (x >= 0 && x < OLED_WIDTH && y >= 0 && y < OLED_HEIGHT) {
      pixels[y][x] = value;
    }
  }
  
  return pixels;
} 