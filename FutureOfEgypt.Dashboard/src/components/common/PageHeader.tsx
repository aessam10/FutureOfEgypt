import { Box, Button, Divider, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onActionClick?: () => void;
  /** Optional additional content on the right */
  rightContent?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onActionClick,
  rightContent,
}: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
                fontWeight: 400,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
          {rightContent}

          {actionLabel && (
            <Button
              variant="contained"
              startIcon={actionIcon}
              onClick={onActionClick}
              aria-label={actionLabel}
              sx={{
                px: 2.5,
                py: 1,
                fontWeight: 600,
                borderRadius: '9px',
              }}
            >
              {actionLabel}
            </Button>
          )}
        </Box>
      </Box>

      <Divider />
    </Box>
  );
}