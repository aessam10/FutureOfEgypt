import { createTheme, type PaletteMode } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ─── Deluxe Brand Colors ─────────────────────────────────────────────────────
const CYAN = '#00F0FF';        // Neon Cyan for accents/glows
const ROYAL_BLUE = '#2563EB';  // Vivid Blue
const DEEP_SPACE = '#03050A';  // Ultra-dark background
const PANEL_BG = '#0A0F1A';    // Slightly lighter for cards
const BORDER_GLOW = 'rgba(0, 240, 255, 0.2)';

// ─── Theme Factory ───────────────────────────────────────────────────────────
export function getTheme(mode: PaletteMode): Theme {
  // In the Deluxe theme, even light mode is pushed towards a high-end sleek look, 
  // but Dark Mode is where this theme truly shines.
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? CYAN : ROYAL_BLUE,
        light: isDark ? '#67E8F9' : '#60A5FA',
        dark: isDark ? '#0891B2' : '#1D4ED8',
        contrastText: isDark ? '#000000' : '#ffffff',
      },
      secondary: {
        main: isDark ? ROYAL_BLUE : CYAN,
        light: isDark ? '#60A5FA' : '#67E8F9',
        dark: isDark ? '#1D4ED8' : '#0891B2',
        contrastText: isDark ? '#ffffff' : '#000000',
      },
      background: {
        default: isDark ? DEEP_SPACE : '#f8fafc',
        paper: isDark ? PANEL_BG : '#ffffff',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#0f172a',
        secondary: isDark ? '#94A3B8' : '#64748b',
      },
      divider: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info: { main: '#3b82f6' },
    },

    shape: { borderRadius: 16 }, // Rounder, softer corners for modern look

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
      // ── MuiCssBaseline ─────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: "'Outfit', 'Inter', 'Roboto', sans-serif",
            backgroundColor: isDark ? DEEP_SPACE : '#f8fafc',
            color: isDark ? '#F1F5F9' : '#0f172a',
            // Custom scrollbar for webkit
            '*::-webkit-scrollbar': { width: '6px', height: '6px' },
            '*::-webkit-scrollbar-track': { background: 'transparent' },
            '*::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderRadius: '3px',
            },
            '*::-webkit-scrollbar-thumb:hover': {
              background: isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0,0,0,0.2)',
            },
          },
        },
      },

      // ── MuiPaper (Glassmorphism Base) ───────────────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(10, 15, 26, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: isDark 
              ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
              : '0 8px 32px rgba(0, 0, 0, 0.03)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          },
        },
      },

      // ── MuiButton (Neon & Premium Feel) ────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 24px',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              background: isDark 
                ? `linear-gradient(135deg, ${ROYAL_BLUE} 0%, ${CYAN} 100%)`
                : `linear-gradient(135deg, #1E3A8A 0%, ${ROYAL_BLUE} 100%)`,
              color: '#fff',
              boxShadow: `0 4px 14px ${isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(37, 99, 235, 0.3)'}`,
              border: 'none',
              '&:hover': {
                background: isDark 
                  ? `linear-gradient(135deg, ${CYAN} 0%, ${ROYAL_BLUE} 100%)`
                  : `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #1E3A8A 100%)`,
                boxShadow: `0 8px 25px ${isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(37, 99, 235, 0.5)'}`,
                transform: 'translateY(-2px)',
              },
              '&:active': { transform: 'translateY(0)' },
            }
          },
          outlined: {
            borderWidth: '1.5px',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
            color: isDark ? '#fff' : '#0f172a',
            '&:hover': {
              borderWidth: '1.5px',
              borderColor: isDark ? CYAN : ROYAL_BLUE,
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.05)' : 'rgba(37, 99, 235, 0.05)',
              boxShadow: isDark ? `0 0 15px ${BORDER_GLOW}` : 'none',
            },
          },
        },
      },

      // ── MuiIconButton ──────────────────────────────────────────
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'all 0.2s ease',
            color: isDark ? '#94A3B8' : '#64748b',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(37, 99, 235, 0.08)',
              color: isDark ? CYAN : ROYAL_BLUE,
              boxShadow: isDark ? `0 0 10px ${BORDER_GLOW}` : 'none',
            },
          },
        },
      },

      // ── MuiTextField (Sleek Inputs) ────────────────────────────
      MuiTextField: {
        defaultProps: { size: 'medium' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.3s ease',
              '&.Mui-focused': {
                backgroundColor: isDark ? 'rgba(0, 240, 255, 0.02)' : '#fff',
                boxShadow: isDark ? `0 0 0 2px ${BORDER_GLOW}` : '0 0 0 2px rgba(37, 99, 235, 0.2)',
              },
              '& fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                transition: 'border-color 0.3s ease',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(37, 99, 235, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: isDark ? CYAN : ROYAL_BLUE,
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#64748b' : '#94a3b8',
              '&.Mui-focused': { color: isDark ? CYAN : ROYAL_BLUE },
            },
          },
        },
      },

      // ── MuiTable ───────────────────────────────────────────────
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: 'transparent',
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: isDark ? '#64748b' : '#94a3b8',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              padding: '16px 20px',
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
              padding: '16px 20px',
              fontSize: '0.9rem',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
            },
            '& .MuiTableRow-hover:hover': {
              backgroundColor: isDark ? 'rgba(0, 240, 255, 0.03)' : 'rgba(37, 99, 235, 0.03)',
              transform: 'scale(1.001)', // micro interaction
            },
          },
        },
      },
    },
  });
}

export const BRAND_CYAN = CYAN;
export const SIDEBAR_BACKGROUND = 'rgba(5, 11, 20, 0.85)';