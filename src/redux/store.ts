import { configureStore } from '@reduxjs/toolkit';
import oledReducer from './oledSlice';
import themeReducer from './themeSlice';
import animationReducer from './animationSlice';

export const store = configureStore({
  reducer: {
    oled: oledReducer,
    theme: themeReducer,
    animation: animationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 