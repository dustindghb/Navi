import { createTheme } from '@mui/material/styles';

// Accent colors
const primaryAccent = '#663F46';
const secondaryAccent = '#B8C4BB';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0A0A0A', paper: '#1A1A1A' },
    text: { primary: '#FAFAFA', secondary: '#B8B8B8' },
    primary: { main: primaryAccent },
    secondary: { main: secondaryAccent },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { variant: 'contained' } },
  },
});


