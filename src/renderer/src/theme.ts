import { createTheme, alpha, PaletteMode } from '@mui/material';

// Function to generate the theme based on the mode
export const getTheme = (mode: PaletteMode) => {
  const isLight = mode === 'light';
  
  // Slate palette (Tailwind-inspired)
  const slate50 = '#F8FAFC';
  const slate100 = '#F1F5F9';
  const slate200 = '#E2E8F0'; // Divider
  const slate300 = '#CBD5E1';
  const slate400 = '#94A3B8';
  const slate500 = '#64748B'; // Text secondary
  const slate600 = '#475569';
  const slate700 = '#334155';
  const slate800 = '#1E293B'; // Text primary
  const slate900 = '#0F172A'; // Primary Main
  const slate950 = '#020617';

  // Blue palette
  const blue500 = '#3B82F6';
  const blue600 = '#2563EB';

  const backgroundDefault = isLight ? slate50 : '#0B1120'; // A bit lighter than absolute black for dark mode
  const backgroundPaper = isLight ? '#FFFFFF' : slate900;
  const textPrimary = isLight ? slate800 : '#F8FAFC';
  const textSecondary = isLight ? slate500 : '#94A3B8';
  const divider = isLight ? slate200 : '#1E293B';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? slate900 : '#FFFFFF', // In dark mode, primary actions often look better white/bright
        light: isLight ? slate700 : '#E2E8F0',
        dark: isLight ? slate950 : '#CBD5E1',
        contrastText: isLight ? '#ffffff' : slate900,
      },
      secondary: {
        main: blue500,
        light: '#60A5FA',
        dark: blue600,
        contrastText: '#ffffff',
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: divider,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontWeight: 600, letterSpacing: '-0.025em' },
      h4: { fontWeight: 600, letterSpacing: '-0.025em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: backgroundDefault,
            // Subtle dot pattern for texture
            backgroundImage: isLight 
              ? `radial-gradient(${alpha(slate300, 0.4)} 1px, transparent 1px)`
              : `radial-gradient(${alpha(slate700, 0.4)} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
            scrollbarColor: isLight ? "#CBD5E1 transparent" : "#334155 transparent",
            "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
              width: 8,
              height: 8,
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
              borderRadius: 8,
              backgroundColor: isLight ? "#CBD5E1" : "#334155",
              minHeight: 24,
            },
            "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
              backgroundColor: isLight ? "#94A3B8" : "#475569",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none', // Remove default elevation gradient
            boxShadow: isLight 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${divider}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(backgroundPaper, 0.8),
            color: textPrimary,
            boxShadow: 'none',
            borderBottom: `1px solid ${divider}`,
            backdropFilter: 'blur(12px)',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: divider,
          },
        },
      },
    },
  });
};

export default getTheme;
