import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  helperText?: string;
  /** Optional: 'success' | 'error' | 'warning' | 'default' */
  accent?: 'success' | 'error' | 'warning' | 'info' | 'default';
  /** Optional: show trend arrow */
  trend?: 'up' | 'down' | 'neutral';
}

import { useThemeMode } from '../../app/ThemeContext';

const TREND_SYMBOLS = {
  up:      { symbol: '↑', color: '#10b981' },
  down:    { symbol: '↓', color: '#ef4444' },
  neutral: { symbol: '→', color: '#64748b' },
};

export function StatCard({
  title,
  value,
  icon,
  helperText,
  accent = 'default',
  trend,
}: StatCardProps) {
  const { isDark } = useThemeMode();

  const ACCENT_COLORS = {
    success: { bg: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', icon: isDark ? '#34D399' : '#10b981', glow: isDark ? 'rgba(16, 185, 129, 0.3)' : 'transparent', border: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)' },
    error:   { bg: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',  icon: isDark ? '#F87171' : '#ef4444', glow: isDark ? 'rgba(239, 68, 68, 0.3)' : 'transparent', border: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)' },
    warning: { bg: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', icon: isDark ? '#FBBF24' : '#f59e0b', glow: isDark ? 'rgba(245, 158, 11, 0.3)' : 'transparent', border: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.15)' },
    info:    { bg: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',  icon: isDark ? '#60A5FA' : '#3b82f6', glow: isDark ? 'rgba(37, 99, 235, 0.3)' : 'transparent', border: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.15)' },
    default: { bg: isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(24, 119, 242, 0.05)',  icon: isDark ? '#00F0FF' : '#1877F2', glow: isDark ? 'rgba(0, 240, 255, 0.3)' : 'transparent', border: isDark ? 'rgba(0, 240, 255, 0.3)' : 'rgba(24, 119, 242, 0.15)' },
  };

  const colors = ACCENT_COLORS[accent];

  return (
    <Paper
      className="stat-card"
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: isDark ? 'translateY(-4px)' : 'translateY(-2px)',
          boxShadow: isDark ? `0 10px 30px ${colors.glow}` : '0 4px 12px rgba(0,0,0,0.05)',
          '&::after': { opacity: isDark ? 1 : 0 },
        },
        // Subtle top border accent
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${colors.icon}, transparent)`,
        },
        // Subtle glow background on hover
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at top left, ${colors.glow}, transparent 50%)`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Icon container */}
        {icon && (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: colors.bg,
              color: colors.icon,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isDark ? `inset 0 0 10px ${colors.glow}, 0 0 15px ${colors.glow}` : 'none',
              border: `1px solid ${colors.border}`,
              position: 'relative',
              zIndex: 2,
              '& svg': { 
                fontSize: '1.4rem',
                filter: isDark ? `drop-shadow(0 0 4px ${colors.icon})` : 'none'
              },
            }}
            aria-hidden="true"
          >
            {icon}
          </Box>
        )}

        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.75,
            }}
          >
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              variant="h4"
              component="span"
              className="fade-in-up"
              sx={{
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
              aria-label={`${title}: ${value}`}
            >
              {value}
            </Typography>

            {trend && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: TREND_SYMBOLS[trend].color,
                }}
                aria-label={`Trend: ${trend}`}
              >
                {TREND_SYMBOLS[trend].symbol}
              </Typography>
            )}
          </Box>

          {helperText && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 0.75,
                fontSize: '0.78rem',
              }}
            >
              {helperText}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}