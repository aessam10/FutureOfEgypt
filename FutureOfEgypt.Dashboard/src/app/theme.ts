import { createTheme, type PaletteMode } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ─── Theme Colors ────────────────────────────────────────────────────────────
// Dark Mode
const DARK_CYAN = '#00F0FF';
const DARK_ROYAL_BLUE = '#2563EB';
const DARK_BG = '#03050A';
const DARK_PAPER = '#0A0F1A';
const DARK_BORDER_GLOW = 'rgba(0, 240, 255, 0.2)';

// Light Mode (Facebook style)
const LIGHT_BLUE = '#1877F2';
const LIGHT_BG = '#F5F7FA';
const LIGHT_PAPER = '#FFFFFF';

// ─── Theme Factory ───────────────────────────────────────────────────────────
export function getTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? DARK_CYAN : LIGHT_BLUE,
        light: isDark ? '#67E8F9' : '#4793FA',
        dark: isDark ? '#0891B2' : '#0F5BB5',
        contrastText: isDark ? '#000000' : '#ffffff',
      },
      secondary: {
        main: isDark ? DARK_ROYAL_BLUE : '#4B5563',
        light: isDark ? '#60A5FA' : '#9CA3AF',
        dark: isDark ? '#1D4ED8' : '#374151',
        contrastText: isDark ? '#ffffff' : '#ffffff',
      },
      background: {
        default: isDark ? DARK_BG : LIGHT_BG,
        paper: isDark ? DARK_PAPER : LIGHT_PAPER,
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#1C2B33',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info: { main: '#3b82f6' },
    },

    shape: { borderRadius: 12 },

    typography: {
      fontFamily: "'Outfit', 'Inter', 'Roboto', sans-serif",
      h4: { fontWeight: 700, letterSpacing: '-0.03em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: "'Outfit', 'Inter', 'Roboto', sans-serif",
            backgroundColor: isDark ? DARK_BG : LIGHT_BG,
            color: isDark ? '#F1F5F9' : '#1C2B33',
            '*::-webkit-scrollbar': { width: '6px', height: '6px' },
            '*::-webkit-scrollbar-track': { background: 'transparent' },
            '*::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
              borderRadius: '3px',
            },
            '*::-webkit-scrollbar-thumb:hover': {
              background: isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0,0,0,0.3)',
            },
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(10, 15, 26, 0.6)' : LIGHT_PAPER,
            backdropFilter: isDark ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: isDark ? 'blur(20px)' : 'none',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDark 
              ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
              : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              background: isDark 
                ? `linear-gradient(135deg, ${DARK_ROYAL_BLUE} 0%, ${DARK_CYAN} 100%)`
                : LIGHT_BLUE,
              color: '#fff',
              boxShadow: isDark ? `0 4px 14px ${DARK_BORDER_GLOW}` : '0 1px 3px rgba(0,0,0,0.1)',
              border: 'none',
              '&:hover': {
                background: isDark 
                  ? `linear-gradient(135deg, ${DARK_CYAN} 0%, ${DARK_ROYAL_BLUE} 100%)`
                  : '#166FE5',
                boxShadow: isDark ? `0 8px 25px rgba(0, 240, 255, 0.4)` : '0 2px 5px rgba(0,0,0,0.15)',
                transform: isDark ? 'translateY(-2px)' : 'none',
              },
              '&:active': { transform: 'translateY(0)' },
            }
          },
          outlined: {
            borderWidth: '1px',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
            color: isDark ? '#fff' : '#1C2B33',
            '&:hover': {
              borderWidth: '1px',
              borderColor: isDark ? DARK_CYAN : LIGHT_BLUE,
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.05)' : 'rgba(24, 119, 242, 0.04)',
              boxShadow: isDark ? `0 0 15px ${DARK_BORDER_GLOW}` : 'none',
            },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s ease',
            color: isDark ? '#94A3B8' : '#64748B',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
              color: isDark ? DARK_CYAN : LIGHT_BLUE,
              boxShadow: isDark ? `0 0 10px ${DARK_BORDER_GLOW}` : 'none',
            },
          },
        },
      },

      MuiTextField: {
        defaultProps: { size: 'medium' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF',
              transition: 'all 0.2s ease',
              '&.Mui-focused': {
                backgroundColor: isDark ? 'rgba(0, 240, 255, 0.02)' : '#FFFFFF',
                boxShadow: isDark ? `0 0 0 2px ${DARK_BORDER_GLOW}` : 'none',
              },
              '& fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
                transition: 'border-color 0.2s ease',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0,0,0,0.3)',
              },
              '&.Mui-focused fieldset': {
                borderColor: isDark ? DARK_CYAN : LIGHT_BLUE,
                borderWidth: '2px',
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#64748B' : '#64748B',
              '&.Mui-focused': { color: isDark ? DARK_CYAN : LIGHT_BLUE },
            },
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: isDark ? 'transparent' : '#F8FAFC',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: isDark ? 'uppercase' : 'none',
              letterSpacing: isDark ? '0.1em' : 'normal',
              color: isDark ? '#64748b' : '#475569',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}`,
              padding: '12px 16px',
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              transition: 'all 0.2s ease',
            },
            '& .MuiTableCell-root': {
              padding: '12px 16px',
              fontSize: '0.875rem',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}`,
            },
            '& .MuiTableRow-hover:hover': {
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.03)' : '#F1F5F9',
              transform: 'none',
            },
          },
        },
      },
    },
  });
}