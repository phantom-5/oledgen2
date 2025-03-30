import { DrawingOperation } from '../redux/oledSlice';
import { TOOL_PIXEL, TOOL_LINE, TOOL_RECTANGLE, TOOL_CIRCLE, TOOL_FILL, OLED_WIDTH, OLED_HEIGHT } from '../utils/CONSTANTS';

/**
 * Generates Adafruit GFX library code based on drawing operations and pixel data
 * @param pixelData - 2D array of booleans representing the OLED display state
 * @param drawingOperations - Array of drawing operations that were performed
 * @returns string of code to reproduce the display using Adafruit GFX
 */
export const generateGFXCode = (
  pixelData: boolean[][],
  drawingOperations: DrawingOperation[] = []
): string => {
  const commands: string[] = [];
  
  // Clear the display first
  commands.push('display.clearDisplay();');
  
  // If drawing operations are available, use them directly to generate code
  if (drawingOperations.length > 0) {
    for (const operation of drawingOperations) {
      switch (operation.type) {
        case 'PIXEL':
          if (operation.params.value) {
            commands.push(`display.drawPixel(${operation.params.x}, ${operation.params.y}, SSD1306_WHITE);`);
          }
          break;
        
        case 'FREEHAND_SEGMENT':
          commands.push(`display.drawLine(${operation.params.x1}, ${operation.params.y1}, ${operation.params.x2}, ${operation.params.y2}, SSD1306_WHITE);`);
          break;
          
        case 'LINE':
          commands.push(`display.drawLine(${operation.params.x1}, ${operation.params.y1}, ${operation.params.x2}, ${operation.params.y2}, SSD1306_WHITE);`);
          break;
          
        case 'RECTANGLE':
          commands.push(`display.drawRect(${operation.params.x}, ${operation.params.y}, ${operation.params.width}, ${operation.params.height}, SSD1306_WHITE);`);
          break;
          
        case 'FILLED_RECTANGLE':
          commands.push(`display.fillRect(${operation.params.x}, ${operation.params.y}, ${operation.params.width}, ${operation.params.height}, SSD1306_WHITE);`);
          break;
          
        case 'CIRCLE':
          commands.push(`display.drawCircle(${operation.params.x}, ${operation.params.y}, ${operation.params.radius}, SSD1306_WHITE);`);
          break;
          
        case 'FILLED_CIRCLE':
          commands.push(`display.fillCircle(${operation.params.x}, ${operation.params.y}, ${operation.params.radius}, SSD1306_WHITE);`);
          break;
          
        case 'ROUNDED_RECTANGLE':
          const cornerRadius = Math.min(5, Math.floor(Math.min(operation.params.width, operation.params.height) / 4));
          commands.push(`display.drawRoundRect(${operation.params.x}, ${operation.params.y}, ${operation.params.width}, ${operation.params.height}, ${cornerRadius}, SSD1306_WHITE);`);
          break;
          
        case 'FILLED_ROUNDED_RECTANGLE':
          const fillCornerRadius = Math.min(5, Math.floor(Math.min(operation.params.width, operation.params.height) / 4));
          commands.push(`display.fillRoundRect(${operation.params.x}, ${operation.params.y}, ${operation.params.width}, ${operation.params.height}, ${fillCornerRadius}, SSD1306_WHITE);`);
          break;
          
        case 'TRIANGLE':
          const { topX, topY, width, height } = operation.params;
          const p1 = { x: topX, y: topY };
          const p2 = { x: Math.max(0, Math.floor(topX - width / 2)), y: Math.min(OLED_HEIGHT - 1, topY + height) };
          const p3 = { x: Math.min(OLED_WIDTH - 1, Math.floor(topX + width / 2)), y: p2.y };
          commands.push(`display.drawTriangle(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y}, ${p3.x}, ${p3.y}, SSD1306_WHITE);`);
          break;
          
        case 'FILLED_TRIANGLE':
          const t = operation.params;
          const tp1 = { x: t.topX, y: t.topY };
          const tp2 = { x: Math.max(0, Math.floor(t.topX - t.width / 2)), y: Math.min(OLED_HEIGHT - 1, t.topY + t.height) };
          const tp3 = { x: Math.min(OLED_WIDTH - 1, Math.floor(t.topX + t.width / 2)), y: tp2.y };
          commands.push(`display.fillTriangle(${tp1.x}, ${tp1.y}, ${tp2.x}, ${tp2.y}, ${tp3.x}, ${tp3.y}, SSD1306_WHITE);`);
          break;
          
        case 'FILL_ALL':
          commands.push('display.fillScreen(SSD1306_WHITE);');
          break;
          
        case 'FLOOD_FILL':
          // For flood fill, we can't directly translate to GFX code
          // Use the shape detection fallback for these areas
          break;
          
        case 'IMPORT_IMAGE':
          // For imported images, we can't directly translate to GFX code
          // Use the shape detection fallback for these areas
          break;
          
        default:
          // Unknown operation, will use shape detection fallback
          break;
      }
    }
  } else {
    // Fallback to shape detection if no drawing operations are available
    // Make a deep copy to mark processed pixels
    const pixelsCopy = pixelData.map(row => [...row]);
    
    // Prioritize shape detection - do circles first as they're most distinctive
    // Detect regular circles (prioritize over filled for better detection)
    findCircles(pixelsCopy, commands);
    
    // Detect filled circles
    findFilledCircles(pixelsCopy, commands);
    
    // Detect triangles (filled and unfilled)
    findTriangles(pixelsCopy, commands);
    
    // Detect rounded rectangles
    findRoundedRectangles(pixelsCopy, commands);
    
    // Detect filled rectangles
    findFilledRectangles(pixelsCopy, commands);
    
    // Detect regular rectangles
    findRectangles(pixelsCopy, commands);
    
    // Find connected pixels for fast lines
    findFastHorizontalLines(pixelsCopy, commands);
    findFastVerticalLines(pixelsCopy, commands);
    
    // Process remaining lines (diagonal)
    findHorizontalLines(pixelsCopy, commands);
    findVerticalLines(pixelsCopy, commands);
    
    // Process remaining individual pixels
    for (let y = 0; y < pixelsCopy.length; y++) {
      for (let x = 0; x < pixelsCopy[y].length; x++) {
        if (pixelsCopy[y][x]) {
          // Add drawPixel for any remaining pixels
          commands.push(`display.drawPixel(${x}, ${y}, SSD1306_WHITE);`);
        }
      }
    }
  }
  
  // Update the display
  commands.push('display.display();');
  
  return commands.join('\n');
};

/**
 * Finds filled rectangles in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findFilledRectangles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Minimum size of filled rectangle to detect
  const minWidth = 3;
  const minHeight = 3;
  
  for (let y = 0; y < height - minHeight; y++) {
    for (let x = 0; x < width - minWidth; x++) {
      // Skip if this pixel is not set or already processed
      if (!pixelData[y][x]) continue;
      
      // Find potential rectangle dimensions
      let rectWidth = findRectangleWidth(pixelData, x, y);
      let rectHeight = findRectangleHeight(pixelData, x, y);
      
      // Check if all pixels in the rectangle are filled
      if (isFilledRectangle(pixelData, x, y, rectWidth, rectHeight)) {
        commands.push(`display.fillRect(${x}, ${y}, ${rectWidth}, ${rectHeight}, SSD1306_WHITE);`);
        
        // Mark all pixels in this filled rectangle as processed
        markFilledRectangleAsProcessed(pixelData, x, y, rectWidth, rectHeight);
      }
    }
  }
};

/**
 * Checks if all pixels in a rectangle are filled
 */
const isFilledRectangle = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): boolean => {
  // Ensure rectangle has meaningful dimensions
  if (width < 2 || height < 2) return false;
  
  // Check all pixels in the rectangle
  for (let j = y; j < y + height; j++) {
    for (let i = x; i < x + width; i++) {
      if (!pixelData[j][i]) return false;
    }
  }
  
  return true;
};

/**
 * Marks all pixels in a filled rectangle as processed
 */
const markFilledRectangleAsProcessed = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): void => {
  for (let j = y; j < y + height; j++) {
    for (let i = x; i < x + width; i++) {
      pixelData[j][i] = false;
    }
  }
};

/**
 * Finds rounded rectangles in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findRoundedRectangles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Minimum size for rounded rectangle detection
  const minWidth = 7;  // Reduced from 8
  const minHeight = 7; // Reduced from 8
  
  for (let y = 0; y < height - minHeight; y++) {
    for (let x = 0; x < width - minWidth; x++) {
      // Skip if this pixel is not set
      if (!pixelData[y][x]) continue;
      
      // Find potential rectangle dimensions
      let rectWidth = findRectangleWidth(pixelData, x, y);
      let rectHeight = findRectangleHeight(pixelData, x, y);
      
      // Check minimum size for rounded rectangle
      if (rectWidth < minWidth || rectHeight < minHeight) continue;
      
      // Check for rounded corners pattern
      const cornerRadius = detectRoundedCorners(pixelData, x, y, rectWidth, rectHeight);
      if (cornerRadius > 0) {
        // Check if it's filled
        if (isFilledRoundedRectangle(pixelData, x, y, rectWidth, rectHeight, cornerRadius)) {
          commands.push(`display.fillRoundRect(${x}, ${y}, ${rectWidth}, ${rectHeight}, ${cornerRadius}, SSD1306_WHITE);`);
          console.log(`Detected filled rounded rect at (${x},${y}) with dimensions ${rectWidth}x${rectHeight}, radius ${cornerRadius}`);
          markRoundedRectangleAsProcessed(pixelData, x, y, rectWidth, rectHeight, cornerRadius, true);
        } else {
          // It's just an outline
          commands.push(`display.drawRoundRect(${x}, ${y}, ${rectWidth}, ${rectHeight}, ${cornerRadius}, SSD1306_WHITE);`);
          console.log(`Detected rounded rect at (${x},${y}) with dimensions ${rectWidth}x${rectHeight}, radius ${cornerRadius}`);
          markRoundedRectangleAsProcessed(pixelData, x, y, rectWidth, rectHeight, cornerRadius, false);
        }
      }
    }
  }
};

/**
 * Detect if the rectangle has rounded corners and determine the radius
 */
const detectRoundedCorners = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): number => {
  // Minimum radius to consider
  const minRadius = 2;
  const maxRadius = Math.min(Math.floor(width / 4), Math.floor(height / 4));
  
  // Check various corner radii
  for (let radius = minRadius; radius <= maxRadius; radius++) {
    if (hasRoundedCornerPattern(pixelData, x, y, width, height, radius)) {
      return radius;
    }
  }
  
  return 0; // Not a rounded rectangle
};

/**
 * Check if the rectangle has a rounded corner pattern with the given radius
 */
const hasRoundedCornerPattern = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  radius: number
): boolean => {
  // More forgiving check for rounded corners
  let cornersMissing = 0;
  
  // Top-left corner check
  if (!isCornerRounded(pixelData, x, y, radius, "top-left")) {
    cornersMissing++;
  }
  
  // Top-right corner check
  if (!isCornerRounded(pixelData, x + width - 1, y, radius, "top-right")) {
    cornersMissing++;
  }
  
  // Bottom-left corner check
  if (!isCornerRounded(pixelData, x, y + height - 1, radius, "bottom-left")) {
    cornersMissing++;
  }
  
  // Bottom-right corner check
  if (!isCornerRounded(pixelData, x + width - 1, y + height - 1, radius, "bottom-right")) {
    cornersMissing++;
  }
  
  // If at least 3 corners are rounded, consider it a rounded rectangle
  return cornersMissing <= 1;
};

/**
 * Check if a specific corner is rounded
 */
const isCornerRounded = (
  pixelData: boolean[][],
  cornerX: number,
  cornerY: number,
  radius: number,
  cornerType: "top-left" | "top-right" | "bottom-left" | "bottom-right"
): boolean => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Ensure we don't go out of bounds
  if (cornerX < 0 || cornerX >= width || cornerY < 0 || cornerY >= height) {
    return false;
  }
  
  let missingCornerPixel = false;
  
  // Check the corner pixel - should be missing for a rounded corner
  switch (cornerType) {
    case "top-left":
      missingCornerPixel = !pixelData[cornerY][cornerX];
      break;
    case "top-right":
      missingCornerPixel = !pixelData[cornerY][cornerX];
      break;
    case "bottom-left":
      missingCornerPixel = !pixelData[cornerY][cornerX];
      break;
    case "bottom-right":
      missingCornerPixel = !pixelData[cornerY][cornerX];
      break;
  }
  
  return missingCornerPixel;
};

/**
 * Check if the rounded rectangle is filled
 */
const isFilledRoundedRectangle = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  radius: number
): boolean => {
  // Check center of the rectangle
  for (let j = y + radius; j <= y + height - radius - 1; j++) {
    for (let i = x + radius; i <= x + width - radius - 1; i++) {
      if (!pixelData[j][i]) return false;
    }
  }
  
  return true;
};

/**
 * Mark a rounded rectangle as processed
 */
const markRoundedRectangleAsProcessed = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  radius: number,
  isFilled: boolean
): void => {
  if (isFilled) {
    // Mark the entire rectangle as processed
    for (let j = y; j < y + height; j++) {
      for (let i = x; i < x + width; i++) {
        // Skip corners that should be empty in a rounded rect
        const isCorner = 
          (i < x + radius && j < y + radius && Math.sqrt(Math.pow(i - (x + radius), 2) + Math.pow(j - (y + radius), 2)) > radius) ||
          (i >= x + width - radius && j < y + radius && Math.sqrt(Math.pow(i - (x + width - radius - 1), 2) + Math.pow(j - (y + radius), 2)) > radius) ||
          (i < x + radius && j >= y + height - radius && Math.sqrt(Math.pow(i - (x + radius), 2) + Math.pow(j - (y + height - radius - 1), 2)) > radius) ||
          (i >= x + width - radius && j >= y + height - radius && Math.sqrt(Math.pow(i - (x + width - radius - 1), 2) + Math.pow(j - (y + height - radius - 1), 2)) > radius);
          
        if (!isCorner && pixelData[j][i]) {
          pixelData[j][i] = false;
        }
      }
    }
  } else {
    // Mark just the perimeter (excluding corners that should be empty)
    // Top and bottom edges
    for (let i = x + radius; i < x + width - radius; i++) {
      pixelData[y][i] = false;
      pixelData[y + height - 1][i] = false;
    }
    
    // Left and right edges
    for (let j = y + radius; j < y + height - radius; j++) {
      pixelData[j][x] = false;
      pixelData[j][x + width - 1] = false;
    }
    
    // Mark the curved portions of corners
    markRoundedCorner(pixelData, x + radius, y + radius, radius, "top-left");
    markRoundedCorner(pixelData, x + width - radius - 1, y + radius, radius, "top-right");
    markRoundedCorner(pixelData, x + radius, y + height - radius - 1, radius, "bottom-left");
    markRoundedCorner(pixelData, x + width - radius - 1, y + height - radius - 1, radius, "bottom-right");
  }
};

/**
 * Mark a rounded corner as processed
 */
const markRoundedCorner = (
  pixelData: boolean[][],
  centerX: number,
  centerY: number,
  radius: number,
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
): void => {
  // Define the angle range based on the corner
  let startAngle = 0;
  let endAngle = 0;
  
  switch (corner) {
    case "top-left":
      startAngle = Math.PI;
      endAngle = 3 * Math.PI / 2;
      break;
    case "top-right":
      startAngle = 3 * Math.PI / 2;
      endAngle = 2 * Math.PI;
      break;
    case "bottom-left":
      startAngle = Math.PI / 2;
      endAngle = Math.PI;
      break;
    case "bottom-right":
      startAngle = 0;
      endAngle = Math.PI / 2;
      break;
  }
  
  // Number of points to check along the quarter circle
  const steps = 16;
  
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    
    // Check if point is within bounds and is set
    if (x >= 0 && x < pixelData[0].length && y >= 0 && y < pixelData.length && pixelData[y][x]) {
      pixelData[y][x] = false;
    }
  }
};

/**
 * Finds filled circles in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findFilledCircles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Minimum radius to detect (reduced for better detection)
  const minRadius = 3;
  const maxRadius = Math.min(width, height) / 3;
  
  for (let centerY = minRadius; centerY < height - minRadius; centerY++) {
    for (let centerX = minRadius; centerX < width - minRadius; centerX++) {
      // Only check points where pixels are set as potential centers
      if (!isNearPixel(pixelData, centerX, centerY, 1)) continue;
      
      // Try different radii
      for (let radius = minRadius; radius < maxRadius; radius++) {
        if (isFilledCircle(pixelData, centerX, centerY, radius)) {
          commands.push(`display.fillCircle(${centerX}, ${centerY}, ${radius}, SSD1306_WHITE);`);
          console.log(`Detected filled circle at (${centerX}, ${centerY}) with radius ${radius}`);
          
          // Mark the filled circle as processed
          markFilledCircleAsProcessed(pixelData, centerX, centerY, radius);
          
          // Move to next potential center
          break;
        }
      }
    }
  }
};

/**
 * Check if pixels form a filled circle
 */
const isFilledCircle = (pixelData: boolean[][], centerX: number, centerY: number, radius: number): boolean => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // First check perimeter
  if (!isCircle(pixelData, centerX, centerY, radius)) return false;
  
  // Then check if it's filled
  // Sample some points inside the circle
  for (let r = 1; r < radius; r += Math.max(1, Math.floor(radius / 5))) {
    const checkRadius = r;
    const numPoints = Math.max(8, checkRadius * 4);
    let allFilled = true;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const x = Math.round(centerX + checkRadius * Math.cos(angle));
      const y = Math.round(centerY + checkRadius * Math.sin(angle));
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (!pixelData[y][x]) {
          allFilled = false;
          break;
        }
      }
    }
    
    if (!allFilled) return false;
  }
  
  // Also check the center
  if (!pixelData[centerY][centerX]) return false;
  
  return true;
};

/**
 * Mark a filled circle as processed
 */
const markFilledCircleAsProcessed = (pixelData: boolean[][], centerX: number, centerY: number, radius: number): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Mark all pixels within the circle's radius
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance <= radius && pixelData[y][x]) {
          pixelData[y][x] = false;
        }
      }
    }
  }
};

/**
 * Finds triangles in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findTriangles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Find potential triangle vertices (local maximums/extremes in the pattern)
  const points = findPotentialTriangleVertices(pixelData);
  
  // Try combinations of three points to form triangles
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      for (let k = j + 1; k < points.length; k++) {
        const p1 = points[i];
        const p2 = points[j];
        const p3 = points[k];
        
        if (isTriangle(pixelData, p1, p2, p3)) {
          if (isFilledTriangle(pixelData, p1, p2, p3)) {
            commands.push(`display.fillTriangle(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y}, ${p3.x}, ${p3.y}, SSD1306_WHITE);`);
            console.log(`Detected filled triangle at (${p1.x},${p1.y}), (${p2.x},${p2.y}), (${p3.x},${p3.y})`);
            markTriangleAsProcessed(pixelData, p1, p2, p3, true);
          } else {
            commands.push(`display.drawTriangle(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y}, ${p3.x}, ${p3.y}, SSD1306_WHITE);`);
            console.log(`Detected triangle at (${p1.x},${p1.y}), (${p2.x},${p2.y}), (${p3.x},${p3.y})`);
            markTriangleAsProcessed(pixelData, p1, p2, p3, false);
          }
        }
      }
    }
  }
};

/**
 * Find potential triangle vertices by looking for local extremes
 */
const findPotentialTriangleVertices = (pixelData: boolean[][]): Array<{x: number, y: number}> => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  const points: Array<{x: number, y: number}> = [];
  
  // Look for corner-like patterns
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!pixelData[y][x]) continue;
      
      // Count neighbors
      let neighborCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (y+dy >= 0 && y+dy < height && x+dx >= 0 && x+dx < width && pixelData[y + dy][x + dx]) {
            neighborCount++;
          }
        }
      }
      
      // Points with few neighbors are likely vertices
      if (neighborCount <= 4) { // Increased from 3 to 4 for better detection
        points.push({x, y});
      }
    }
  }
  
  // Add points with sharp directional changes (edge detection)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (!pixelData[y][x]) continue;
      
      // Check for directional changes (edge detection)
      if (hasDirectionalChange(pixelData, x, y)) {
        points.push({x, y});
      }
    }
  }
  
  return points;
};

/**
 * Check if a point has significant directional changes (indicates a corner)
 */
const hasDirectionalChange = (pixelData: boolean[][], x: number, y: number): boolean => {
  // Count pixels in different directions
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // orthogonal
    [-1, -1], [1, -1], [-1, 1], [1, 1] // diagonal
  ];
  
  let onDirections = 0;
  for (const [dx, dy] of directions) {
    if (pixelData[y + dy]?.[x + dx]) {
      onDirections++;
    }
  }
  
  // If exactly 2-3 directions have pixels, it might be a corner
  return onDirections >= 2 && onDirections <= 3;
};

/**
 * Check if three points form a valid triangle
 */
const isTriangle = (pixelData: boolean[][], p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): boolean => {
  // Check if the triangle is large enough
  const area = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  if (area < 9) return false;  // Minimum area threshold
  
  // Enforce minimum distance between points to avoid tiny triangles
  const minDistance = 5;
  const d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const d23 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
  const d31 = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
  
  if (d12 < minDistance || d23 < minDistance || d31 < minDistance) {
    return false;
  }
  
  // Check if the edges of the triangle are marked
  return isLineMarked(pixelData, p1, p2, 0.7) && // Lowered threshold from 0.8 to 0.7
         isLineMarked(pixelData, p2, p3, 0.7) && 
         isLineMarked(pixelData, p3, p1, 0.7);
};

/**
 * Check if the line between two points is marked in the pixel data
 */
const isLineMarked = (
  pixelData: boolean[][], 
  p1: {x: number, y: number}, 
  p2: {x: number, y: number},
  threshold: number = 0.8 // Added default threshold
): boolean => {
  // Use Bresenham's line algorithm to check if the line is marked
  const dx = Math.abs(p2.x - p1.x);
  const dy = -Math.abs(p2.y - p1.y);
  const sx = p1.x < p2.x ? 1 : -1;
  const sy = p1.y < p2.y ? 1 : -1;
  let err = dx + dy;
  
  let x = p1.x;
  let y = p1.y;
  let pixelCount = 0;
  let markedCount = 0;
  
  const lineLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  
  while (true) {
    pixelCount++;
    if (y >= 0 && y < pixelData.length && x >= 0 && x < pixelData[0].length && pixelData[y][x]) {
      markedCount++;
    }
    
    if (x === p2.x && y === p2.y) break;
    
    const e2 = 2 * err;
    if (e2 >= dy) {
      if (x === p2.x) break;
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      if (y === p2.y) break;
      err += dx;
      y += sy;
    }
  }
  
  // Allow some tolerance for missing pixels
  return pixelCount > 0 && markedCount / pixelCount > threshold;
};

/**
 * Check if the triangle is filled
 */
const isFilledTriangle = (pixelData: boolean[][], p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): boolean => {
  // Find bounding box of the triangle
  const minX = Math.min(p1.x, p2.x, p3.x);
  const maxX = Math.max(p1.x, p2.x, p3.x);
  const minY = Math.min(p1.y, p2.y, p3.y);
  const maxY = Math.max(p1.y, p2.y, p3.y);
  
  // Sample some points inside the triangle
  let insideCount = 0;
  let filledCount = 0;
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isPointInTriangle({x, y}, p1, p2, p3)) {
        insideCount++;
        if (pixelData[y][x]) filledCount++;
      }
    }
  }
  
  return insideCount > 0 && filledCount / insideCount > 0.8;
};

/**
 * Check if a point is inside a triangle
 */
const isPointInTriangle = (p: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): boolean => {
  const area = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  const area1 = Math.abs((p.x * (p2.y - p3.y) + p2.x * (p3.y - p.y) + p3.x * (p.y - p2.y)) / 2);
  const area2 = Math.abs((p1.x * (p.y - p3.y) + p.x * (p3.y - p1.y) + p3.x * (p1.y - p.y)) / 2);
  const area3 = Math.abs((p1.x * (p2.y - p.y) + p2.x * (p.y - p1.y) + p.x * (p1.y - p2.y)) / 2);
  
  // Allow some floating point imprecision
  return Math.abs(area - (area1 + area2 + area3)) < 0.1;
};

/**
 * Mark a triangle as processed
 */
const markTriangleAsProcessed = (pixelData: boolean[][], p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, filled: boolean): void => {
  if (filled) {
    // Mark all pixels inside the triangle
    const minX = Math.min(p1.x, p2.x, p3.x);
    const maxX = Math.max(p1.x, p2.x, p3.x);
    const minY = Math.min(p1.y, p2.y, p3.y);
    const maxY = Math.max(p1.y, p2.y, p3.y);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (pixelData[y] && pixelData[y][x] && isPointInTriangle({x, y}, p1, p2, p3)) {
          pixelData[y][x] = false;
        }
      }
    }
  } else {
    // Mark just the perimeter
    markLine(pixelData, p1, p2);
    markLine(pixelData, p2, p3);
    markLine(pixelData, p3, p1);
  }
};

/**
 * Mark a line as processed
 */
const markLine = (pixelData: boolean[][], p1: {x: number, y: number}, p2: {x: number, y: number}): void => {
  // Use Bresenham's line algorithm
  const dx = Math.abs(p2.x - p1.x);
  const dy = -Math.abs(p2.y - p1.y);
  const sx = p1.x < p2.x ? 1 : -1;
  const sy = p1.y < p2.y ? 1 : -1;
  let err = dx + dy;
  
  let x = p1.x;
  let y = p1.y;
  
  while (true) {
    if (pixelData[y] && pixelData[y][x]) pixelData[y][x] = false;
    
    if (x === p2.x && y === p2.y) break;
    
    const e2 = 2 * err;
    if (e2 >= dy) {
      if (x === p2.x) break;
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      if (y === p2.y) break;
      err += dx;
      y += sy;
    }
  }
};

/**
 * Finds horizontal lines to use drawFastHLine
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findFastHorizontalLines = (pixelData: boolean[][], commands: string[]): void => {
  for (let y = 0; y < pixelData.length; y++) {
    let startX = -1;
    
    for (let x = 0; x < pixelData[y].length; x++) {
      if (pixelData[y][x]) {
        if (startX === -1) {
          startX = x;
        }
        
        // If we reach the end of a row or the end of a line
        if (x === pixelData[y].length - 1) {
          if (x - startX >= 1) {
            const length = x - startX + 1;
            commands.push(`display.drawFastHLine(${startX}, ${y}, ${length}, SSD1306_WHITE);`);
            
            // Mark these pixels as processed
            for (let i = startX; i <= x; i++) {
              pixelData[y][i] = false;
            }
          }
          startX = -1;
        }
      } else if (startX !== -1) {
        // We've found the end of a line
        if (x - 1 - startX >= 1) {
          const length = x - startX;
          commands.push(`display.drawFastHLine(${startX}, ${y}, ${length}, SSD1306_WHITE);`);
          
          // Mark these pixels as processed
          for (let i = startX; i < x; i++) {
            pixelData[y][i] = false;
          }
        }
        startX = -1;
      }
    }
  }
};

/**
 * Finds vertical lines to use drawFastVLine
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findFastVerticalLines = (pixelData: boolean[][], commands: string[]): void => {
  for (let x = 0; x < pixelData[0].length; x++) {
    let startY = -1;
    
    for (let y = 0; y < pixelData.length; y++) {
      if (pixelData[y][x]) {
        if (startY === -1) {
          startY = y;
        }
        
        // If we reach the end of a column or the end of a line
        if (y === pixelData.length - 1) {
          if (y - startY >= 1) {
            const length = y - startY + 1;
            commands.push(`display.drawFastVLine(${x}, ${startY}, ${length}, SSD1306_WHITE);`);
            
            // Mark these pixels as processed
            for (let i = startY; i <= y; i++) {
              pixelData[i][x] = false;
            }
          }
          startY = -1;
        }
      } else if (startY !== -1) {
        // We've found the end of a line
        if (y - 1 - startY >= 1) {
          const length = y - startY;
          commands.push(`display.drawFastVLine(${x}, ${startY}, ${length}, SSD1306_WHITE);`);
          
          // Mark these pixels as processed
          for (let i = startY; i < y; i++) {
            pixelData[i][x] = false;
          }
        }
        startY = -1;
      }
    }
  }
};

/**
 * Creates a 2D array of booleans initialized to false
 * @param width - Width of the array
 * @param height - Height of the array
 * @returns 2D array of booleans
 */
export const createEmptyPixelArray = (width: number, height: number): boolean[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(false));
};

/**
 * Exports the OLED grid as a PNG image
 * @param pixelData - 2D array of booleans representing the OLED display state
 * @param pixelSize - Size of each pixel in the exported image
 * @param onColor - Color for 'on' pixels
 * @param offColor - Color for 'off' pixels
 * @returns Promise that resolves to a data URL for the image
 */
export const exportAsImage = (
  pixelData: boolean[][],
  pixelSize: number = 4,
  onColor: string = '#FFFFFF',
  offColor: string = '#000000'
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    const width = pixelData[0].length;
    const height = pixelData.length;
    
    // Set canvas dimensions
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;
    
    // Fill the background with the 'off' color
    ctx.fillStyle = offColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the 'on' pixels
    ctx.fillStyle = onColor;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixelData[y][x]) {
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');
    resolve(dataUrl);
  });
};

/**
 * Detects rectangles in the pixel data and generates drawRect commands
 * @param pixelData - 2D array of booleans representing pixels (will be modified)
 * @param commands - Array of GFX commands to add to
 */
const findRectangles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Minimum size of rectangle to detect (can be adjusted)
  const minWidth = 3;
  const minHeight = 3;
  
  for (let y = 0; y < height - minHeight; y++) {
    for (let x = 0; x < width - minWidth; x++) {
      // Skip if this pixel is not set or already processed
      if (!pixelData[y][x]) continue;
      
      // Check if this could be the top-left corner of a rectangle
      if (!isRectangleCorner(pixelData, x, y)) continue;
      
      // Find the potential rectangle dimensions
      let rectWidth = findRectangleWidth(pixelData, x, y);
      let rectHeight = findRectangleHeight(pixelData, x, y);
      
      // Verify it's a proper rectangle by checking all corners and edges
      if (isValidRectangle(pixelData, x, y, rectWidth, rectHeight)) {
        // Add the rectangle command
        commands.push(`display.drawRect(${x}, ${y}, ${rectWidth}, ${rectHeight}, SSD1306_WHITE);`);
        
        // Mark these pixels as processed (only the outline)
        markRectangleAsProcessed(pixelData, x, y, rectWidth, rectHeight);
      }
    }
  }
};

/**
 * Checks if a pixel is a potential rectangle corner
 */
const isRectangleCorner = (pixelData: boolean[][], x: number, y: number): boolean => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Top-left corner should be on, and have pixels to the right and below
  return pixelData[y][x] && 
         x + 1 < width && pixelData[y][x + 1] && 
         y + 1 < height && pixelData[y + 1][x];
};

/**
 * Finds the potential width of a rectangle starting at (x, y)
 */
const findRectangleWidth = (pixelData: boolean[][], x: number, y: number): number => {
  const width = pixelData[0].length;
  let rectWidth = 1;
  
  for (let i = x + 1; i < width; i++) {
    if (pixelData[y][i]) {
      rectWidth++;
    } else {
      break;
    }
  }
  
  return rectWidth;
};

/**
 * Finds the potential height of a rectangle starting at (x, y)
 */
const findRectangleHeight = (pixelData: boolean[][], x: number, y: number): number => {
  const height = pixelData.length;
  let rectHeight = 1;
  
  for (let i = y + 1; i < height; i++) {
    if (pixelData[i][x]) {
      rectHeight++;
    } else {
      break;
    }
  }
  
  return rectHeight;
};

/**
 * Checks if a rectangle is valid (has proper outline)
 */
const isValidRectangle = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): boolean => {
  // Check the rectangle is at least 3x3
  if (width < 3 || height < 3) return false;
  
  // Check all four sides of the rectangle
  
  // Top edge
  for (let i = x; i < x + width; i++) {
    if (!pixelData[y][i]) return false;
  }
  
  // Bottom edge
  for (let i = x; i < x + width; i++) {
    if (!pixelData[y + height - 1][i]) return false;
  }
  
  // Left edge
  for (let i = y; i < y + height; i++) {
    if (!pixelData[i][x]) return false;
  }
  
  // Right edge
  for (let i = y; i < y + height; i++) {
    if (!pixelData[i][x + width - 1]) return false;
  }
  
  return true;
};

/**
 * Marks a rectangle's outline as processed
 */
const markRectangleAsProcessed = (
  pixelData: boolean[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): void => {
  // Top edge
  for (let i = x; i < x + width; i++) {
    pixelData[y][i] = false;
  }
  
  // Bottom edge
  for (let i = x; i < x + width; i++) {
    pixelData[y + height - 1][i] = false;
  }
  
  // Left edge (skip corners to avoid double processing)
  for (let i = y + 1; i < y + height - 1; i++) {
    pixelData[i][x] = false;
  }
  
  // Right edge (skip corners to avoid double processing)
  for (let i = y + 1; i < y + height - 1; i++) {
    pixelData[i][x + width - 1] = false;
  }
};

/**
 * Detects circles in the pixel data and generates drawCircle commands
 * @param pixelData - 2D array of booleans representing pixels (will be modified)
 * @param commands - Array of GFX commands to add to
 */
const findCircles = (pixelData: boolean[][], commands: string[]): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Minimum radius of circle to detect (reduced to catch smaller circles)
  const minRadius = 3;
  const maxRadius = Math.min(width, height) / 2;
  
  // Scan the entire grid for potential circle centers
  for (let centerY = minRadius; centerY < height - minRadius; centerY++) {
    for (let centerX = minRadius; centerX < width - minRadius; centerX++) {
      // Only check points where pixels are set as potential centers
      if (!isNearPixel(pixelData, centerX, centerY, 2)) continue;
      
      // Try different radii
      for (let radius = minRadius; radius < maxRadius; radius++) {
        if (isCircle(pixelData, centerX, centerY, radius)) {
          commands.push(`display.drawCircle(${centerX}, ${centerY}, ${radius}, SSD1306_WHITE);`);
          console.log(`Detected circle at (${centerX}, ${centerY}) with radius ${radius}`);
          
          // Mark the circle pixels as processed
          markCircleAsProcessed(pixelData, centerX, centerY, radius);
          
          // Move to next potential center
          break;
        }
      }
    }
  }
};

/**
 * Check if there are active pixels near the given coordinates
 */
const isNearPixel = (pixelData: boolean[][], centerX: number, centerY: number, distance: number): boolean => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  for (let y = Math.max(0, centerY - distance); y <= Math.min(height - 1, centerY + distance); y++) {
    for (let x = Math.max(0, centerX - distance); x <= Math.min(width - 1, centerX + distance); x++) {
      if (pixelData[y][x]) return true;
    }
  }
  
  return false;
};

/**
 * Check if pixels form a circle with given center and radius
 */
const isCircle = (pixelData: boolean[][], centerX: number, centerY: number, radius: number): boolean => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Number of points on the circle to check (increased for better sampling)
  const numPoints = Math.max(24, radius * 6);
  let onCount = 0;
  let totalPoints = 0;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      totalPoints++;
      if (pixelData[y][x]) {
        onCount++;
      }
    }
  }
  
  // Consider it a circle if at least 75% of points are on (lowered threshold)
  return totalPoints > 0 && onCount / totalPoints > 0.75 && onCount >= 12;
};

/**
 * Mark the pixels of a circle as processed
 */
const markCircleAsProcessed = (pixelData: boolean[][], centerX: number, centerY: number, radius: number): void => {
  const height = pixelData.length;
  const width = pixelData[0].length;
  
  // Number of points on the circle to mark
  const numPoints = Math.max(32, radius * 8);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      pixelData[y][x] = false;
    }
  }
};

/**
 * Finds horizontal lines in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findHorizontalLines = (pixelData: boolean[][], commands: string[]): void => {
  for (let y = 0; y < pixelData.length; y++) {
    let startX = -1;
    
    for (let x = 0; x < pixelData[y].length; x++) {
      if (pixelData[y][x]) {
        if (startX === -1) {
          startX = x;
        }
        
        // If we reach the end of a row or the end of a line
        if (x === pixelData[y].length - 1) {
          if (x - startX >= 1) {
            commands.push(`display.drawLine(${startX}, ${y}, ${x}, ${y}, SSD1306_WHITE);`);
            
            // Mark these pixels as processed
            for (let i = startX; i <= x; i++) {
              pixelData[y][i] = false;
            }
          }
          startX = -1;
        }
      } else if (startX !== -1) {
        // We've found the end of a line
        if (x - 1 - startX >= 1) {
          commands.push(`display.drawLine(${startX}, ${y}, ${x - 1}, ${y}, SSD1306_WHITE);`);
          
          // Mark these pixels as processed
          for (let i = startX; i < x; i++) {
            pixelData[y][i] = false;
          }
        }
        startX = -1;
      }
    }
  }
};

/**
 * Finds vertical lines in the pixel data
 * @param pixelData - 2D array of booleans representing pixels
 * @param commands - Array of GFX commands to add to
 */
const findVerticalLines = (pixelData: boolean[][], commands: string[]): void => {
  for (let x = 0; x < pixelData[0].length; x++) {
    let startY = -1;
    
    for (let y = 0; y < pixelData.length; y++) {
      if (pixelData[y][x]) {
        if (startY === -1) {
          startY = y;
        }
        
        // If we reach the end of a column or the end of a line
        if (y === pixelData.length - 1) {
          if (y - startY >= 1) {
            commands.push(`display.drawLine(${x}, ${startY}, ${x}, ${y}, SSD1306_WHITE);`);
            
            // Mark these pixels as processed
            for (let i = startY; i <= y; i++) {
              pixelData[i][x] = false;
            }
          }
          startY = -1;
        }
      } else if (startY !== -1) {
        // We've found the end of a line
        if (y - 1 - startY >= 1) {
          commands.push(`display.drawLine(${x}, ${startY}, ${x}, ${y - 1}, SSD1306_WHITE);`);
          
          // Mark these pixels as processed
          for (let i = startY; i < y; i++) {
            pixelData[i][x] = false;
          }
        }
        startY = -1;
      }
    }
  }
};

// Export calculateLinePoints for animation component
export const calculateLinePoints = (x1: number, y1: number, x2: number, y2: number): { x: number, y: number }[] => {
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