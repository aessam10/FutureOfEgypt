import React from 'react';
import { Chip } from '@mui/material';
import { AppUpdateLevel } from '../types/appUpdates';

interface Props {
    level?: AppUpdateLevel;
}

const AppUpdateLevelChip: React.FC<Props> = ({ level }) => {
    switch (level) {
        case AppUpdateLevel.Mandatory:
            return <Chip label="Mandatory" color="error" size="small" />;
        case AppUpdateLevel.Required:
            return <Chip label="Required" color="warning" size="small" />;
        case AppUpdateLevel.Recommended:
            return <Chip label="Recommended" color="info" size="small" />;
        case AppUpdateLevel.Optional:
            return <Chip label="Optional" color="default" size="small" />;
        default:
            return <Chip label="Unknown" color="default" size="small" variant="outlined" />;
    }
};

export default AppUpdateLevelChip;
