import React from 'react';
import { Chip } from '@mui/material';
import { AppUpdateStatus } from '../types/appUpdates';

interface Props {
    status: AppUpdateStatus;
}

const AppUpdateStatusChip: React.FC<Props> = ({ status }) => {
    switch (status) {
        case AppUpdateStatus.UpToDate:
            return <Chip label="Up To Date" color="success" size="small" />;
        case AppUpdateStatus.UpdateAvailable:
        case AppUpdateStatus.UpdateRecommended:
            return <Chip label="Needs Update" color="info" size="small" />;
        case AppUpdateStatus.UpdateRequired:
        case AppUpdateStatus.MandatoryUpdateRequired:
            return <Chip label="Mandatory" color="error" size="small" />;
        case AppUpdateStatus.UpdateStarted:
            return <Chip label="Update Started" color="warning" size="small" />;
        case AppUpdateStatus.UpdateFailed:
            return <Chip label="Failed" color="error" size="small" variant="outlined" />;
        case AppUpdateStatus.Unknown:
        default:
            return <Chip label="Unknown" color="default" size="small" variant="outlined" />;
    }
};

export default AppUpdateStatusChip;
