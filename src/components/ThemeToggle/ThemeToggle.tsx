import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { RootState } from '../../redux/store';
import { toggleTheme } from '../../redux/themeSlice';
import { THEME_DARK } from '../../utils/CONSTANTS';
import styles from './ThemeToggle.module.css';

const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <div className={styles['theme-toggle']}>
      <Tooltip title={`Switch to ${mode === THEME_DARK ? 'light' : 'dark'} mode`}>
        <IconButton onClick={handleToggleTheme} color="inherit">
          {mode === THEME_DARK ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default ThemeToggle; 