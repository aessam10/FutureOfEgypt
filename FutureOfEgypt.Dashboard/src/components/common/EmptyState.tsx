import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Paper
      sx={{
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Box>
        {icon && <Box sx={{ mb: 2 }}>{icon}</Box>}

        <Typography variant="h6">{title}</Typography>

        {description && (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}