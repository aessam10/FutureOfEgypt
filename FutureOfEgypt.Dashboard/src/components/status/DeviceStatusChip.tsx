import { StatusChip } from './StatusChip';

interface DeviceStatusChipProps {
  status: number;
}

export function DeviceStatusChip({ status }: DeviceStatusChipProps) {
  if (status === 1) {
    return <StatusChip label="Active" color="success" />;
  }

  if (status === 2) {
    return <StatusChip label="Inactive" color="warning" />;
  }

  return <StatusChip label="Unknown" color="default" />;
}