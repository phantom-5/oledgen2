import React from 'react';
import { useSelector } from 'react-redux';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  Box, 
  Typography,
  Paper,
  Grid
} from '@mui/material';
import { RootState } from './redux/store';
import OLEDGrid from './components/OLEDGrid/OLEDGrid';
import OLEDToolbar from './components/OLEDGrid/OLEDToolbar';
import CodeGenerator from './components/CodeGenerator/CodeGenerator';
import SaveLoadDesigns from './components/SaveLoad/SaveLoadDesigns';
import ImageExport from './components/ImageExport/ImageExport';
import ImageImport from './components/ImageImport/ImageImport';
import DrawingTools from './components/DrawingTools/DrawingTools';
import ThemeToggle from './components/ThemeToggle/ThemeToggle';
import AnimationSequence from './components/Animation/AnimationSequence';
import { THEME_DARK } from './utils/CONSTANTS';
import './App.css';

const App: React.FC = () => {
  const { mode } = useSelector((state: RootState) => state.theme);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode === THEME_DARK ? 'dark' : 'light',
        },
      }),
    [mode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" className="app-container">
        <ThemeToggle />
        
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            OLED Display Designer
          </Typography>
          
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              mb: 4, 
              backgroundColor: mode === THEME_DARK ? '#222' : '#fff',
              color: mode === THEME_DARK ? '#fff' : 'inherit'
            }}
          >
            <Typography variant="body1" paragraph>
              Design your 128x64 OLED display by clicking on pixels to toggle them on/off.
              Once you're finished, click "Generate Code" to create the Adafruit GFX code for your design.
              Use the Animation Sequence to create a series of frames for animation.
            </Typography>
          </Paper>
          
          <OLEDToolbar />
          <DrawingTools />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={9} lg={9}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <OLEDGrid />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3} lg={3}>
              <SaveLoadDesigns />
              <ImageImport />
              <ImageExport />
            </Grid>
          </Grid>
          
          <AnimationSequence />
          
          <CodeGenerator />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App; 