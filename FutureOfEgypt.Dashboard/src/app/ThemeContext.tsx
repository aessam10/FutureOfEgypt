import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getTheme } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  isDark: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('foe-theme-mode') as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // localStorage not available
    }
    // Default to light mode
    return 'light';
  });

  const muiTheme = useMemo(() => getTheme(mode), [mode]);

  function toggleMode() {
    setMode((current) => {
      const next: ThemeMode = current === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('foe-theme-mode', next);
      } catch {
        // ignore
      }
      return next;
    });
  }

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode, isDark: mode === 'dark' }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeMode must be used inside AppThemeProvider');
  }

  return context;
}
