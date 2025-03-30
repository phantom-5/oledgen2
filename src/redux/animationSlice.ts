import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createEmptyPixelArray } from '../utils/reusableFns';
import { OLED_WIDTH, OLED_HEIGHT } from '../utils/CONSTANTS';

// Number of frames in the animation sequence
const FRAME_COUNT = 6;

interface AnimationState {
  frames: boolean[][][]; // Array of frames, each frame is a 2D array of pixels
  currentFrame: number; // Current frame index
}

const initialState: AnimationState = {
  frames: [],
  currentFrame: 0
};

const animationSlice = createSlice({
  name: 'animation',
  initialState,
  reducers: {
    // Initialize frames with empty pixel arrays
    initFrames: (state) => {
      state.frames = Array(FRAME_COUNT)
        .fill(null)
        .map(() => createEmptyPixelArray(OLED_WIDTH, OLED_HEIGHT));
      state.currentFrame = 0;
    },
    
    // Set the current frame
    setCurrentFrame: (state, action: PayloadAction<number>) => {
      const frameIndex = action.payload;
      if (frameIndex >= 0 && frameIndex < state.frames.length) {
        state.currentFrame = frameIndex;
      }
    },
    
    // Update pixels for the specified frame
    setFramePixels: (state, action: PayloadAction<{ frameIndex: number, pixels: boolean[][] }>) => {
      const { frameIndex, pixels } = action.payload;
      
      if (frameIndex >= 0 && frameIndex < state.frames.length) {
        // Set current frame
        state.currentFrame = frameIndex;
        
        // Check if the pixels are actually different to avoid unnecessary updates
        const currentFramePixels = state.frames[frameIndex];
        let hasChanges = false;
        
        // Quick check if pixels are different
        for (let y = 0; y < pixels.length; y++) {
          for (let x = 0; x < pixels[y].length; x++) {
            if (currentFramePixels[y][x] !== pixels[y][x]) {
              hasChanges = true;
              break;
            }
          }
          if (hasChanges) break;
        }
        
        // Only update if there are actual changes
        if (hasChanges) {
          // Update the current frame with the provided pixels
          state.frames[frameIndex] = pixels.map(row => [...row]);
          
          // Propagate changes to subsequent frames based on our rules
          for (let i = frameIndex + 1; i < state.frames.length; i++) {
            state.frames[i] = state.frames[i - 1].map(row => [...row]);
          }
        }
      }
    },
    
    // Clear a specific frame
    clearFrame: (state, action: PayloadAction<number>) => {
      const frameIndex = action.payload;
      
      if (frameIndex >= 0 && frameIndex < state.frames.length) {
        state.frames[frameIndex] = createEmptyPixelArray(OLED_WIDTH, OLED_HEIGHT);
      }
    }
  }
});

export const { initFrames, setCurrentFrame, setFramePixels, clearFrame } = animationSlice.actions;
export default animationSlice.reducer; 