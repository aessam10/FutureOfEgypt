import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onActionClick?: () => void;
}

export function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onActionClick,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>

          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {actionLabel && (
          <Button variant="contained" startIcon={actionIcon} onClick={onActionClick}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}