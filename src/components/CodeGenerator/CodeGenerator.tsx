import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, Typography, TextField, Snackbar, Switch, FormControlLabel } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { RootState } from '../../redux/store';
import { generateGFXCode } from '../../utils/reusableFns';
import styles from './CodeGenerator.module.css';

const CodeGenerator: React.FC = () => {
  const { pixels, drawingOperations } = useSelector((state: RootState) => state.oled);
  const { mode } = useSelector((state: RootState) => state.theme);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [useShapeDetection, setUseShapeDetection] = useState<boolean>(false);

  // Check if an image was imported
  const hasImportedImage = drawingOperations.length > 0 && 
    drawingOperations[0].type === 'IMPORT_IMAGE';
  
  // Check if there are drawing operations after the image import
  const hasDrawingsAfterImport = hasImportedImage && drawingOperations.length > 1;

  // Auto-switch shape detection based on context
  useEffect(() => {
    // Enable shape detection when an image is imported and no drawings on top
    if (hasImportedImage && !hasDrawingsAfterImport) {
      setUseShapeDetection(true);
    } 
    // Disable shape detection when drawing manually on top of an image
    else if (hasDrawingsAfterImport || 
            (drawingOperations.length > 0 && !hasImportedImage)) {
      setUseShapeDetection(false);
    }
  }, [drawingOperations, hasImportedImage, hasDrawingsAfterImport]);

  const handleGenerateCode = () => {
    // Make a deep copy of the pixels array to avoid modifying the original
    const pixelsCopy = pixels.map(row => [...row]);
    
    // Generate code using drawing operations if available and shape detection is not forced
    const code = useShapeDetection 
      ? generateGFXCode(pixelsCopy) 
      : generateGFXCode(pixelsCopy, drawingOperations);
      
    setGeneratedCode(code);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Paper 
      elevation={3} 
      className={styles['code-generator-container']}
      sx={{ 
        backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
        padding: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Adafruit GFX Code
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={useShapeDetection}
            onChange={(e) => setUseShapeDetection(e.target.checked)}
            color="primary"
          />
        }
        label="Force shape detection (ignore drawing operations)"
        sx={{ mb: 2 }}
      />
      
      <Box mb={2}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleGenerateCode}
          fullWidth
        >
          Generate Code
        </Button>
      </Box>
      
      {generatedCode && (
        <>
          <TextField
            multiline
            rows={10}
            value={generatedCode}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
              className: styles['code-output'],
              sx: { 
                fontFamily: 'monospace', 
                backgroundColor: mode === 'dark' ? '#1e1e1e' : '#f8f8f8' 
              }
            }}
          />
          
          <Box mt={2}>
            <Button 
              variant="outlined" 
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyToClipboard}
            >
              Copy to Clipboard
            </Button>
          </Box>
          
          <Snackbar
            open={openSnackbar}
            autoHideDuration={3000}
            onClose={handleCloseSnackbar}
            message="Code copied to clipboard!"
          />
        </>
      )}
    </Paper>
  );
};

export default CodeGenerator; 