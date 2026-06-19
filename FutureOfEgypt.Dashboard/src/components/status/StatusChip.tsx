import { Chip } from '@mui/material';

interface StatusChipProps {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export function StatusChip({ label, color = 'default' }: StatusChipProps) {
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}