import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  helperText?: string;
}

export function StatCard({ title, value, icon, helperText }: StatCardProps) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}

        <Box>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>

          <Typography variant="h4" sx={{ mt: 0.5 }}>
            {value}
          </Typography>

          {helperText && (
            <Typography color="text.secondary" variant="caption">
              {helperText}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}