import { createSlice } from '@reduxjs/toolkit';
import { THEME_DARK, THEME_LIGHT } from '../utils/CONSTANTS';

interface ThemeState {
  mode: string;
}

const initialState: ThemeState = {
  mode: THEME_DARK,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    },
  },
});

export const { toggleTheme } = themeSlice.actions;

export default themeSlice.reducer; 