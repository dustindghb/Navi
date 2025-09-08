import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { appTheme } from './theme';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <ThemeProvider theme={appTheme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);


