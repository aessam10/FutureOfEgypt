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

const ACCENT_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.1)', icon: '#34D399', text: '#34D399', glow: 'rgba(16, 185, 129, 0.3)' },
  error:   { bg: 'rgba(239, 68, 68, 0.1)',  icon: '#F87171', text: '#F87171', glow: 'rgba(239, 68, 68, 0.3)' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', icon: '#FBBF24', text: '#FBBF24', glow: 'rgba(245, 158, 11, 0.3)' },
  info:    { bg: 'rgba(37, 99, 235, 0.1)',  icon: '#60A5FA', text: '#60A5FA', glow: 'rgba(37, 99, 235, 0.3)' },
  default: { bg: 'rgba(0, 240, 255, 0.1)',  icon: '#00F0FF', text: '#00F0FF', glow: 'rgba(0, 240, 255, 0.3)' },
};

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
          transform: 'translateY(-4px)',
          boxShadow: `0 10px 30px ${colors.glow}`,
          '&::after': { opacity: 1 },
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
              boxShadow: `inset 0 0 10px ${colors.glow}, 0 0 15px ${colors.glow}`,
              border: `1px solid ${colors.glow}`,
              position: 'relative',
              zIndex: 2,
              '& svg': { 
                fontSize: '1.4rem',
                filter: `drop-shadow(0 0 4px ${colors.icon})`
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