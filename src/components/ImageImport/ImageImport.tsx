import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Paper, 
  Typography, 
  Button, 
  Box, 
  Slider, 
  FormControlLabel, 
  Checkbox, 
  Snackbar, 
  Alert 
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { RootState } from '../../redux/store';
import { importImage } from '../../redux/oledSlice';
import { OLED_WIDTH, OLED_HEIGHT } from '../../utils/CONSTANTS';
import styles from './ImageImport.module.css';

const ImageImport: React.FC = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);
  const [threshold, setThreshold] = useState<number>(128);
  const [invert, setInvert] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
      showAlert('Please select an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    if (!previewUrl) {
      showAlert('Please select an image first', 'error');
      return;
    }

    processImage(previewUrl, threshold, invert);
  };

  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const processImage = (dataUrl: string, threshold: number, invert: boolean) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OLED_WIDTH;
      canvas.height = OLED_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        showAlert('Failed to process image', 'error');
        return;
      }
      
      // Draw image to canvas, resizing it to fit OLED dimensions
      ctx.drawImage(img, 0, 0, OLED_WIDTH, OLED_HEIGHT);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, OLED_WIDTH, OLED_HEIGHT);
      const data = imageData.data;
      
      // Convert to monochrome based on threshold
      const pixelData: boolean[][] = Array(OLED_HEIGHT).fill(null).map(() => Array(OLED_WIDTH).fill(false));
      
      for (let y = 0; y < OLED_HEIGHT; y++) {
        for (let x = 0; x < OLED_WIDTH; x++) {
          const index = (y * OLED_WIDTH + x) * 4;
          // Calculate grayscale value (average of R, G, B)
          const grayscale = (data[index] + data[index + 1] + data[index + 2]) / 3;
          
          // Set pixel based on threshold and invert option
          pixelData[y][x] = invert 
            ? grayscale < threshold 
            : grayscale >= threshold;
        }
      }
      
      // Dispatch the imported image to Redux
      dispatch(importImage(pixelData));
      showAlert('Image imported successfully', 'success');
    };
    
    img.onerror = () => {
      showAlert('Failed to load image', 'error');
    };
    
    img.src = dataUrl;
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Paper
      elevation={3}
      className={styles['image-import-container']}
      sx={{
        backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
        padding: 2,
        marginBottom: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Import Image
      </Typography>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      
      <Button
        variant="contained"
        startIcon={<FileUploadIcon />}
        onClick={handleButtonClick}
        fullWidth
        sx={{ mb: 2 }}
      >
        Select Image
      </Button>
      
      {previewUrl && (
        <Box className={styles['preview-container']}>
          <Typography variant="subtitle2" gutterBottom>
            Preview
          </Typography>
          <img 
            src={previewUrl} 
            alt="Preview" 
            className={styles['preview-image']}
          />
          
          <Box mt={2}>
            <Typography id="threshold-slider" gutterBottom>
              Threshold: {threshold}
            </Typography>
            <Slider
              value={threshold}
              onChange={(_, value) => setThreshold(value as number)}
              aria-labelledby="threshold-slider"
              min={0}
              max={255}
              valueLabelDisplay="auto"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={invert}
                  onChange={(e) => setInvert(e.target.checked)}
                />
              }
              label="Invert colors"
            />
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              fullWidth
              sx={{ mt: 1 }}
            >
              Import to OLED Grid
            </Button>
          </Box>
        </Box>
      )}
      
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={3000} 
        onClose={() => setAlertOpen(false)}
      >
        <Alert 
          onClose={() => setAlertOpen(false)} 
          severity={alertSeverity} 
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ImageImport; 