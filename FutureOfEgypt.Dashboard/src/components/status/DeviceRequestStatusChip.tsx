import { StatusChip } from './StatusChip';

interface DeviceRequestStatusChipProps {
  status: number;
}

export function DeviceRequestStatusChip({ status }: DeviceRequestStatusChipProps) {
  if (status === 1) {
    return <StatusChip label="Pending" color="warning" />;
  }

  if (status === 2) {
    return <StatusChip label="Approved" color="success" />;
  }

  if (status === 3) {
    return <StatusChip label="Rejected" color="error" />;
  }

  return <StatusChip label="Unknown" color="default" />;
}