import { StatusChip } from './StatusChip';

interface EngineerStatusChipProps {
  status: number;
}

export function EngineerStatusChip({ status }: EngineerStatusChipProps) {
  if (status === 1) {
    return <StatusChip label="Active" color="success" />;
  }

  if (status === 2) {
    return <StatusChip label="Inactive" color="warning" />;
  }

  return <StatusChip label="Unknown" color="default" />;
}