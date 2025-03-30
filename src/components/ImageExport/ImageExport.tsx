import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, Typography, Snackbar, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { RootState } from '../../redux/store';
import { exportAsImage } from '../../utils/reusableFns';
import { COLOR_ON, COLOR_OFF } from '../../utils/CONSTANTS';
import styles from './ImageExport.module.css';

const ImageExport: React.FC = () => {
  const { pixels } = useSelector((state: RootState) => state.oled);
  const { mode } = useSelector((state: RootState) => state.theme);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [pixelSize, setPixelSize] = useState<number>(4);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExportImage = async () => {
    try {
      setExportStatus('Generating image...');
      // Make a deep copy of the pixels array
      const pixelsCopy = pixels.map(row => [...row]);
      
      // Generate the image data URL
      const dataUrl = await exportAsImage(
        pixelsCopy,
        pixelSize,
        COLOR_ON,
        COLOR_OFF
      );
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `oled-design-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      
      setExportStatus('');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Failed to export image:', error);
      setExportStatus('');
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handlePixelSizeChange = (event: SelectChangeEvent<number>) => {
    setPixelSize(event.target.value as number);
  };

  return (
    <Paper 
      elevation={3} 
      className={styles['image-export-container']}
      sx={{ 
        backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
        padding: 2,
        marginTop: 2,
        marginBottom: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Export as Image
      </Typography>
      
      <Box className={styles['export-controls']}>
        <FormControl variant="outlined" sx={{ minWidth: 120, mr: 2 }}>
          <InputLabel id="pixel-size-label">Pixel Size</InputLabel>
          <Select
            labelId="pixel-size-label"
            id="pixel-size-select"
            value={pixelSize}
            onChange={handlePixelSizeChange}
            label="Pixel Size"
          >
            <MenuItem value={1}>1px</MenuItem>
            <MenuItem value={2}>2px</MenuItem>
            <MenuItem value={4}>4px</MenuItem>
            <MenuItem value={8}>8px</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<FileDownloadIcon />}
          onClick={handleExportImage}
          disabled={!!exportStatus}
        >
          {exportStatus || 'Export as PNG'}
        </Button>
      </Box>
      
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="Image exported successfully!"
      />
    </Paper>
  );
};

export default ImageExport; 