import { createTheme } from '@mui/material/styles';

// Create a dark theme matching your monochrome design
export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { 
      default: '#0A0A0A', 
      paper: '#1A1A1A' 
    },
    text: { 
      primary: '#FAFAFA', 
      secondary: '#B8B8B8' 
    },
    primary: { 
      main: '#3C362A' 
    },
    secondary: { 
      main: '#2A2A2A' 
    },
    error: {
      main: '#FF6B6B'
    },
    success: {
      main: '#4CAF50'
    }
  },
  shape: { 
    borderRadius: 8 
  },
  components: {
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A'
        } 
      } 
    },
    MuiButton: { 
      defaultProps: { 
        variant: 'contained' 
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#2A2A2A',
            '& fieldset': {
              borderColor: '#333',
            },
            '&:hover fieldset': {
              borderColor: '#555',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3C362A',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#FAFAFA',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#3C362A',
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: '#2A1A1A',
          border: '1px solid #FF6B6B',
          '&.MuiAlert-standardSuccess': {
            backgroundColor: '#1A2A1A',
            border: '1px solid #4CAF50',
          }
        }
      }
    }
  },
});
