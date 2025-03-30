import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Slider, 
  Stack
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setPixelsFromFrame } from '../../redux/oledSlice';
import { setFramePixels, initFrames, setCurrentFrame } from '../../redux/animationSlice';
import styles from './AnimationSequence.module.css';
import { OLED_WIDTH, OLED_HEIGHT, COLOR_ON, COLOR_OFF, PIXEL_SIZE } from '../../utils/CONSTANTS';

const AnimationSequence: React.FC = () => {
  const dispatch = useDispatch();
  const { pixels } = useSelector((state: RootState) => state.oled);
  const { frames, currentFrame } = useSelector((state: RootState) => state.animation);
  const { mode } = useSelector((state: RootState) => state.theme);
  const [sliderValue, setSliderValue] = useState<number>(0);

  // Initialize frames if they don't exist yet
  useEffect(() => {
    if (frames.length === 0) {
      dispatch(initFrames());
    }
  }, [dispatch, frames.length]);

  // Update slider value when current frame changes
  useEffect(() => {
    setSliderValue(currentFrame);
  }, [currentFrame]);

  // Handle changing frames
  const handleFrameChange = (frameIndex: number) => {
    // Update current frame in animation state
    dispatch(setCurrentFrame(frameIndex));
    
    // Update OLED pixels from the selected frame
    if (frames[frameIndex]) {
      dispatch(setPixelsFromFrame(frames[frameIndex]));
    }
  };

  // Generate bitmap arrays for all frames
  const generateBitmaps = () => {
    const bitmaps = frames.map(frame => {
      // Convert 2D boolean array to bitmap format
      const bitmap: string[] = [];
      
      // For Adafruit OLED (SSD1306), we need to arrange data in pages
      // Each page is 8 pixels high, and we have 8 pages total for 64 pixels height
      for (let page = 0; page < OLED_HEIGHT / 8; page++) {
        let row = '';
        
        // For each column in this page
        for (let x = 0; x < OLED_WIDTH; x++) {
          let byte = 0;
          
          // Each byte represents 8 vertical pixels in this column
          // For SSD1306, bit 0 is the top pixel, bit 7 is the bottom pixel
          for (let bit = 0; bit < 8; bit++) {
            const y = page * 8 + bit;
            if (y < OLED_HEIGHT && frame[y][x]) {
              // Set the bit if pixel is on
              // For SSD1306: bit 0 (LSB) = top pixel, bit 7 (MSB) = bottom pixel
              byte |= (1 << bit);
            }
          }
          
          // Convert byte to hex
          const hex = byte.toString(16).padStart(2, '0');
          row += `0x${hex}, `;
          
          // Add newline every 16 bytes for readability
          if ((x + 1) % 16 === 0 && x < OLED_WIDTH - 1) {
            row += '\n    ';
          }
        }
        bitmap.push(row);
      }
      
      return bitmap;
    });
    
    // Format the output for Arduino C code
    let outputText = `// Generated bitmap arrays for ${frames.length} frames\n`;
    outputText += `// Each frame is ${OLED_WIDTH}x${OLED_HEIGHT} pixels\n`;
    outputText += `// Total size: ${frames.length} frames * ${OLED_WIDTH * (OLED_HEIGHT/8)} bytes = ${frames.length * OLED_WIDTH * (OLED_HEIGHT/8)} bytes\n\n`;
    
    // Calculate the frame size in bytes
    const frameSizeBytes = OLED_WIDTH * (OLED_HEIGHT / 8);
    
    outputText += `// For Adafruit SSD1306 OLED displays\n`;
    outputText += `static const unsigned char PROGMEM frame_data[${frames.length}][${frameSizeBytes}] = {\n`;
    
    bitmaps.forEach((bitmap, index) => {
      outputText += `  { // Frame ${index + 1}\n`;
      outputText += bitmap.map(row => `    ${row}`).join('\n');
      outputText += '\n  }' + (index < bitmaps.length - 1 ? ',' : '') + '\n';
    });
    
    outputText += '};\n\n';
    
    // Add example usage for both Adafruit GFX and direct buffer access
    outputText += `/*\n`;
    outputText += `// EXAMPLE 1: Using Adafruit GFX library drawBitmap function:\n`;
    outputText += `void displayFrame(int frameIndex) {\n`;
    outputText += `  display.clearDisplay();\n`;
    outputText += `  display.drawBitmap(0, 0, frame_data[frameIndex], ${OLED_WIDTH}, ${OLED_HEIGHT}, SSD1306_WHITE);\n`;
    outputText += `  display.display();\n`;
    outputText += `}\n\n`;
    
    outputText += `// EXAMPLE 2: Direct buffer manipulation (faster):\n`;
    outputText += `void displayFrameDirect(int frameIndex) {\n`;
    outputText += `  // Copy the frame data directly to the display buffer\n`;
    outputText += `  memcpy(display.getBuffer(), frame_data[frameIndex], ${frameSizeBytes});\n`;
    outputText += `  display.display();\n`;
    outputText += `}\n*/`;
    
    // Create a temporary textarea to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = outputText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('Bitmap arrays copied to clipboard in Adafruit OLED format!');
  };

  // Generate Arduino-friendly bitmap format
  const generateArduinoCompatibleBitmaps = () => {
    const bitmaps = frames.map(frame => {
      const bitmap: string[] = [];
      
      // For Arduino-friendly format (vertical byte orientation)
      for (let page = 0; page < OLED_HEIGHT / 8; page++) {
        let row = '';
        
        for (let x = 0; x < OLED_WIDTH; x++) {
          let byte = 0;
          
          // In Arduino libraries, bit 0 is the TOP pixel in the byte
          for (let bit = 0; bit < 8; bit++) {
            const y = page * 8 + bit;
            if (y < OLED_HEIGHT && frame[y][x]) {
              byte |= (1 << bit);
            }
          }
          
          const hex = byte.toString(16).padStart(2, '0');
          row += `0x${hex},`;
          
          // Add newline every 16 bytes for readability
          if ((x + 1) % 16 === 0 && x < OLED_WIDTH - 1) {
            row += '\n  ';
          }
        }
        bitmap.push(row);
      }
      
      return bitmap.join('\n  ');
    });
    
    // Arduino code format
    let outputText = `#include <SPI.h>\n`;
    outputText += `#include <Wire.h>\n`;
    outputText += `#include <Adafruit_GFX.h>\n`;
    outputText += `#include <Adafruit_SSD1306.h>\n\n`;
    
    outputText += `#define SCREEN_WIDTH 128\n`;
    outputText += `#define SCREEN_HEIGHT 64\n\n`;
    
    outputText += `// Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)\n`;
    outputText += `#define OLED_RESET -1 // Reset pin # (or -1 if sharing Arduino reset pin)\n`;
    outputText += `Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);\n\n`;
    
    // Calculate the frame size in bytes
    const frameSizeBytes = OLED_WIDTH * (OLED_HEIGHT / 8);
    
    outputText += `// Frame data - ${frames.length} frames of ${OLED_WIDTH}x${OLED_HEIGHT} pixels\n`;
    outputText += `// Each frame is ${frameSizeBytes} bytes\n`;
    
    bitmaps.forEach((bitmap, index) => {
      outputText += `const unsigned char PROGMEM frame${index + 1}[] = {\n  ${bitmap}\n};\n\n`;
    });
    
    // Add array of frame pointers
    outputText += `// Array of pointers to frames\n`;
    outputText += `const unsigned char* const frames[] = {\n`;
    for (let i = 0; i < frames.length; i++) {
      outputText += `  frame${i + 1}${i < frames.length - 1 ? ',' : ''}\n`;
    }
    outputText += `};\n\n`;
    
    // Setup and loop functions
    outputText += `void setup() {\n`;
    outputText += `  Serial.begin(9600);\n\n`;
    
    outputText += `  // SSD1306 initialization\n`;
    outputText += `  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n`;
    outputText += `    Serial.println(F("SSD1306 allocation failed"));\n`;
    outputText += `    for(;;); // Don't proceed, loop forever\n`;
    outputText += `  }\n\n`;
    
    outputText += `  // Show initial display buffer contents on the screen\n`;
    outputText += `  display.display();\n`;
    outputText += `  delay(2000); // Pause for 2 seconds\n\n`;
    
    outputText += `  // Clear the buffer\n`;
    outputText += `  display.clearDisplay();\n`;
    outputText += `}\n\n`;
    
    outputText += `void loop() {\n`;
    outputText += `  // Display each frame with a delay\n`;
    outputText += `  for (int i = 0; i < ${frames.length}; i++) {\n`;
    outputText += `    display.clearDisplay();\n`;
    outputText += `    display.drawBitmap(0, 0, frames[i], ${OLED_WIDTH}, ${OLED_HEIGHT}, SSD1306_WHITE);\n`;
    outputText += `    display.display();\n`;
    outputText += `    delay(200); // Adjust animation speed\n`;
    outputText += `  }\n`;
    outputText += `}\n`;
    
    // Create a temporary textarea to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = outputText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('Complete Arduino sketch copied to clipboard!');
  };

  // Generate bitmap in Adafruit's exact format (binary with B prefix)
  const generateAdafruitBitmap = () => {
    const bitmaps = frames.map(frame => {
      const bitmap: string[] = [];
      
      // Adafruit format in the example is arranged in rows (horizontally)
      // Each row has bytes representing 8 horizontal pixels
      for (let y = 0; y < OLED_HEIGHT; y++) {
        let row = '';
        
        // Process 8 pixels at a time horizontally
        for (let x = 0; x < OLED_WIDTH; x += 8) {
          let byte = 0;
          
          // For each bit in the byte (8 horizontal pixels)
          for (let bit = 0; bit < 8; bit++) {
            if (x + bit < OLED_WIDTH && frame[y][x + bit]) {
              // Set the bit if pixel is on, MSB first ordering
              byte |= (1 << (7 - bit));
            }
          }
          
          // Convert byte to binary with 'B' prefix
          const binary = 'B' + byte.toString(2).padStart(8, '0');
          row += binary + ', ';
          
          // Add a newline at the end of each row
          if (x + 8 >= OLED_WIDTH) {
            row = row.trim();
            if (row.endsWith(',')) {
              row = row.slice(0, -1);
            }
          }
        }
        bitmap.push(row);
      }
      
      return bitmap;
    });
    
    // Format the output - just the bitmap data, no additional code
    let outputText = '';
    
    bitmaps.forEach((bitmap, index) => {
      outputText += `static const unsigned char PROGMEM frame${index + 1}[] =\n`;
      outputText += `{ ${bitmap.join(',\n  ')} };\n\n`;
    });
    
    // Add array of frame pointers only
    outputText += `const unsigned char* const frames[] = {\n`;
    for (let i = 0; i < frames.length; i++) {
      outputText += `  frame${i + 1}${i < frames.length - 1 ? ',' : ''}\n`;
    }
    outputText += `};\n`;
    
    // Create a temporary textarea to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = outputText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('Bitmap arrays copied to clipboard!');
  };

  // Render the frame at the specified index
  const renderFrame = (frameIndex: number) => {
    const framePixels = frames[frameIndex];
    
    if (!framePixels) return null;
    
    return (
      <Box 
        className={styles.frameGrid}
        sx={{ 
          backgroundColor: COLOR_OFF,
          border: frameIndex === currentFrame ? '2px solid blue' : '1px solid gray',
          transform: `scale(${frameIndex === currentFrame ? 1 : 0.8})`,
          padding: '8px'
        }}
      >
        <Typography variant="body2" color="#ffffff" align="center" sx={{ mb: 1 }}>
          Frame {frameIndex + 1}
        </Typography>
        <div className={styles.grid}>
          {Array.from({ length: OLED_HEIGHT }).map((_, y) => (
            <div key={y} className={styles.gridRow}>
              {Array.from({ length: OLED_WIDTH }).map((_, x) => {
                const isOn = framePixels[y][x];
                
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      width: `${PIXEL_SIZE / 3}px`, // Smaller pixels for the preview
                      height: `${PIXEL_SIZE / 3}px`,
                      backgroundColor: isOn ? COLOR_ON : COLOR_OFF,
                      border: `0.1px solid ${mode === 'dark' ? '#333' : '#ddd'}`,
                      boxSizing: 'border-box'
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Box>
    );
  };

  // Handle frame click
  const handleFrameClick = (frameIndex: number) => {
    handleFrameChange(frameIndex);
  };

  return (
    <Paper 
      elevation={3} 
      className={styles.animationContainer}
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: mode === 'dark' ? '#222' : '#f5f5f5',
        color: mode === 'dark' ? '#fff' : 'inherit'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Animation Sequence
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom sx={{ color: mode === 'dark' ? '#ddd' : 'inherit' }}>
          Current Frame: {currentFrame + 1} of {frames.length}
        </Typography>
        <Slider
          value={sliderValue}
          min={0}
          max={frames.length - 1}
          step={1}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `Frame ${value + 1}`}
          onChange={(_, value) => setSliderValue(value as number)}
          onChangeCommitted={(_, value) => {
            handleFrameChange(value as number);
          }}
        />
      </Box>
      
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ 
          overflowX: 'auto', 
          pb: 1,
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          }
        }}
      >
        {frames.map((_, index) => (
          <Box 
            key={index} 
            sx={{ minWidth: 'max-content' }}
            onClick={() => handleFrameClick(index)}
          >
            {renderFrame(index)}
          </Box>
        ))}
      </Stack>
      
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={generateBitmaps}
          fullWidth
        >
          Generate Bitmaps
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={generateArduinoCompatibleBitmaps}
          fullWidth
        >
          Arduino Sketch
        </Button>
      </Stack>
      
      <Button 
        variant="contained" 
        color="success" 
        onClick={generateAdafruitBitmap}
        fullWidth
        sx={{ mt: 2 }}
      >
        Adafruit Format
      </Button>
    </Paper>
  );
};

export default AnimationSequence; 