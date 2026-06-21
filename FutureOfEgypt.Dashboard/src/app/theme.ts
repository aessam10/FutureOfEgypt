import { createTheme, type PaletteMode } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ─── Brand Colors ────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';        // From the official logo
const TEAL = '#0f766e';        // Primary brand color
const BLUE = '#2563eb';        // Secondary
const SIDEBAR_BG = '#0f1923';  // Dark navy — matches logo background

// ─── Theme Factory ───────────────────────────────────────────────────────────
export function getTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: TEAL,
        light: '#14b8a6',
        dark: '#0d6360',
        contrastText: '#ffffff',
      },
      secondary: {
        main: BLUE,
        light: '#3b82f6',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0d1117' : '#f0f4f8',
        paper: isDark ? '#161b22' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e6edf3' : '#0f1923',
        secondary: isDark ? '#8b949e' : '#64748b',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info: { main: '#3b82f6' },
    },

    shape: { borderRadius: 12 },

    typography: {
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      caption: { letterSpacing: '0.02em' },
    },

    components: {
      // ── MuiCssBaseline ─────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
          },
        },
      },

      // ── MuiPaper ───────────────────────────────────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
          },
        },
      },

      // ── MuiButton ──────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(15,118,110,0.3)',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': { borderWidth: '1.5px' },
          },
        },
      },

      // ── MuiIconButton ──────────────────────────────────────────
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          },
        },
      },

      // ── MuiTextField ───────────────────────────────────────────
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              fontSize: '0.9rem',
              transition: 'box-shadow 0.2s ease',
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px rgba(15,118,110,0.15)`,
              },
              '& fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                transition: 'border-color 0.2s ease',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              },
            },
          },
        },
      },

      // ── MuiSelect ──────────────────────────────────────────────
      MuiSelect: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },

      // ── MuiAutocomplete ────────────────────────────────────────
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          },
          option: {
            borderRadius: 6,
            margin: '2px 6px',
            padding: '8px 10px',
          },
        },
      },

      // ── MuiTable ───────────────────────────────────────────────
      MuiTable: {
        styleOverrides: {
          root: { borderCollapse: 'separate', borderSpacing: 0 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: isDark ? '#1c2330' : '#f8fafc',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: isDark ? '#8b949e' : '#64748b',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              padding: '12px 16px',
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              transition: 'background-color 0.15s ease',
            },
            '& .MuiTableCell-root': {
              padding: '14px 16px',
              fontSize: '0.9rem',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            },
            '& .MuiTableRow-hover:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,118,110,0.04)',
            },
          },
        },
      },

      // ── MuiChip ────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.75rem',
            height: 26,
          },
        },
      },

      // ── MuiDialog ──────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.1rem',
            fontWeight: 700,
            padding: '20px 24px 12px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: { padding: '12px 24px 8px' },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '12px 24px 20px', gap: 8 },
        },
      },

      // ── MuiAlert ───────────────────────────────────────────────
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 500,
            fontSize: '0.875rem',
          },
        },
      },

      // ── MuiTooltip ─────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.78rem',
            fontWeight: 500,
            borderRadius: 6,
            padding: '6px 10px',
            backgroundColor: isDark ? '#30363d' : '#1e293b',
          },
        },
      },

      // ── MuiListItemButton ──────────────────────────────────────
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s ease',
          },
        },
      },

      // ── MuiTablePagination ─────────────────────────────────────
      MuiTablePagination: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          },
        },
      },

      // ── MuiBadge ───────────────────────────────────────────────
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 700,
            fontSize: '0.7rem',
            minWidth: 18,
            height: 18,
            padding: '0 4px',
          },
        },
      },
    },
  });
}

// ─── Gold accent exported for use in components ──────────────────────────────
export const BRAND_GOLD = GOLD;
export const SIDEBAR_BACKGROUND = SIDEBAR_BG;