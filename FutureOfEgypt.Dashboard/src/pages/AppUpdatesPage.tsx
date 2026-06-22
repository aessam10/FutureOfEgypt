import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
    IconButton, Tooltip, Snackbar, Alert, CircularProgress, Chip
} from '@mui/material';
import { ContentCopy, CloudUpload, PlayArrow } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAppReleases, createAppRelease, uploadReleaseApk, activateRelease, getDeviceAppStatuses 
} from '../api/appUpdatesApi';
import type { CreateAppReleaseRequest, AppReleaseResponse, DeviceAppStatusResponse } from '../types/appUpdates';
import AppUpdateLevelChip from '../components/AppUpdateLevelChip';
import AppUpdateStatusChip from '../components/AppUpdateStatusChip';
import { useAuth } from '../auth/AuthContext';

const AppUpdatesPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [uploadingReleaseId, setUploadingReleaseId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({ open: false, message: '', severity: 'success' });
    
    const [newRelease, setNewRelease] = useState<CreateAppReleaseRequest>({
        platform: 'Android',
        versionName: '',
        versionCode: 0,
        minimumRecommendedVersionCode: 0,
        minimumRequiredVersionCode: 0,
        minimumMandatoryVersionCode: 0,
        releaseNotes: ''
    });

    const { data: releases = [], isLoading: isLoadingReleases } = useQuery<AppReleaseResponse[], Error>({ queryKey: ['appReleases'], queryFn: getAppReleases });
    const { data: deviceStatuses = [], isLoading: isLoadingDevices } = useQuery<DeviceAppStatusResponse[], Error>({ queryKey: ['deviceAppStatuses'], queryFn: getDeviceAppStatuses });

    const activeRelease = releases.find((r: AppReleaseResponse) => r.isActive && r.platform.toLowerCase() === 'android');

    const createMutation = useMutation<AppReleaseResponse, Error, CreateAppReleaseRequest>({
        mutationFn: createAppRelease,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appReleases'] });
            setCreateDialogOpen(false);
            showSnackbar('Release created successfully.', 'success');
        },
        onError: (error: any) => {
            showSnackbar(error.response?.data?.message || 'Failed to create release.', 'error');
        }
    });

    const activateMutation = useMutation<AppReleaseResponse, Error, string>({
        mutationFn: activateRelease,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appReleases'] });
            showSnackbar('Release activated successfully.', 'success');
        },
        onError: (error: any) => {
            showSnackbar(error.response?.data?.message || 'Failed to activate release.', 'error');
        }
    });

    const handleCreateRelease = () => {
        createMutation.mutate(newRelease);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, publicId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingReleaseId(publicId);
        try {
            await uploadReleaseApk(publicId, file);
            queryClient.invalidateQueries({ queryKey: ['appReleases'] });
            showSnackbar('APK uploaded successfully.', 'success');
        } catch (error: any) {
            let errorMessage = 'Failed to upload APK.';
            if (error.response?.status === 413) {
                errorMessage = 'APK upload failed. Maximum allowed size is 300 MB.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (typeof error.response?.data === 'string' && error.response.data) {
                errorMessage = error.response.data;
            } else if (error.response?.data?.title) {
                errorMessage = error.response.data.title;
            } else if (error.message) {
                errorMessage = error.message;
            }
            showSnackbar(errorMessage, 'error');
        } finally {
            setUploadingReleaseId(null);
            if (event.target) event.target.value = '';
        }
    };

    const handleActivate = (publicId: string) => {
        activateMutation.mutate(publicId);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Copied to clipboard', 'success');
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderReleaseCard = (release: AppReleaseResponse) => (
        <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #1976d2' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Current Active {release.platform} Release</Typography>
                <AppUpdateLevelChip level={release.updateLevel} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">Version Name</Typography>
                    <Typography variant="body1">{release.versionName}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">Version Code</Typography>
                    <Typography variant="body1">{release.versionCode}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">Min Mandatory</Typography>
                    <Typography variant="body1">{release.minimumMandatoryVersionCode || 'None'}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">Size</Typography>
                    <Typography variant="body1">{formatBytes(release.fileSizeBytes)}</Typography>
                </Box>
                <Box sx={{ width: '100%', p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">Download URL</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{release.apkDownloadUrl || 'Not available'}</Typography>
                        {release.apkDownloadUrl && (
                            <IconButton size="small" onClick={() => copyToClipboard(release.apkDownloadUrl)}>
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                </Box>
                <Box sx={{ width: '100%', p: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">SHA-256 Checksum</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{release.apkSha256 || 'Not available'}</Typography>
                        {release.apkSha256 && (
                            <IconButton size="small" onClick={() => copyToClipboard(release.apkSha256)}>
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                </Box>
            </Box>
            {(!release.apkFileName || release.fileSizeBytes <= 0 || !release.apkSha256) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    APK file metadata is incomplete. Please upload the APK file.
                </Alert>
            )}
        </Paper>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">App Updates Management</Typography>
                {(user?.roles.includes('Admin') || user?.roles.includes('Manager')) && (
                    <Button variant="contained" color="primary" onClick={() => setCreateDialogOpen(true)}>
                        Create Release
                    </Button>
                )}
            </Box>

            {activeRelease ? renderReleaseCard(activeRelease) : (
                <Alert severity="info" sx={{ mb: 3 }}>No active Android release found.</Alert>
            )}

            <Typography variant="h5" sx={{ mb: 2 }}>Release History</Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Version</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Min Mandatory</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>File Size</TableCell>
                            <TableCell>Created At</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoadingReleases ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : releases.map((r: AppReleaseResponse) => (
                            <TableRow key={r.publicId}>
                                <TableCell>{r.versionName}</TableCell>
                                <TableCell>{r.versionCode}</TableCell>
                                <TableCell>{r.minimumMandatoryVersionCode || '-'}</TableCell>
                                <TableCell>
                                    <Chip label={r.isActive ? "Active" : "Inactive"} color={r.isActive ? "success" : "default"} size="small" />
                                </TableCell>
                                <TableCell>{formatBytes(r.fileSizeBytes)}</TableCell>
                                <TableCell>{new Date(r.publishedAt).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    {!r.isActive && (
                                        <Tooltip title="Activate">
                                            <span>
                                                <IconButton 
                                                    color="success" 
                                                    onClick={() => handleActivate(r.publicId)}
                                                    disabled={!r.apkFileName || r.fileSizeBytes <= 0 || !r.apkSha256}
                                                >
                                                    <PlayArrow />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <input
                                        accept=".apk"
                                        style={{ display: 'none' }}
                                        id={`upload-apk-${r.publicId}`}
                                        type="file"
                                        onChange={(e) => handleFileUpload(e, r.publicId)}
                                    />
                                    <Tooltip title="Upload APK">
                                        <label htmlFor={`upload-apk-${r.publicId}`}>
                                            <IconButton color="primary" component="span" disabled={uploadingReleaseId === r.publicId}>
                                                {uploadingReleaseId === r.publicId ? <CircularProgress size={24} /> : <CloudUpload />}
                                            </IconButton>
                                        </label>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoadingReleases && releases.length === 0 && (
                            <TableRow><TableCell colSpan={7} align="center">No releases found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="h5" sx={{ mb: 2 }}>Devices Update Status</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Engineer</TableCell>
                            <TableCell>Device</TableCell>
                            <TableCell>Current Ver</TableCell>
                            <TableCell>Target Ver</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Last Checked</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoadingDevices ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : deviceStatuses.map((d: DeviceAppStatusResponse) => (
                            <TableRow key={d.publicId}>
                                <TableCell>{d.engineerName}</TableCell>
                                <TableCell>{d.deviceName}</TableCell>
                                <TableCell>{d.appVersionName} ({d.appVersionCode})</TableCell>
                                <TableCell>{d.latestVersionCode}</TableCell>
                                <TableCell><AppUpdateStatusChip status={d.status} /></TableCell>
                                <TableCell>{new Date(d.lastCheckedAt).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                        {!isLoadingDevices && deviceStatuses.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center">No device statuses found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Release</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField 
                            label="Version Name (e.g. 1.0.5)" 
                            fullWidth 
                            value={newRelease.versionName}
                            onChange={(e) => setNewRelease({...newRelease, versionName: e.target.value})}
                        />
                        <TextField 
                            label="Version Code (e.g. 5)" 
                            type="number" 
                            fullWidth 
                            value={newRelease.versionCode || ''}
                            onChange={(e) => setNewRelease({...newRelease, versionCode: parseInt(e.target.value) || 0})}
                        />
                        <TextField 
                            label="Min Mandatory Version Code" 
                            type="number" 
                            fullWidth 
                            value={newRelease.minimumMandatoryVersionCode || ''}
                            onChange={(e) => setNewRelease({...newRelease, minimumMandatoryVersionCode: parseInt(e.target.value) || undefined})}
                        />
                        <TextField 
                            label="Min Required Version Code" 
                            type="number" 
                            fullWidth 
                            value={newRelease.minimumRequiredVersionCode || ''}
                            onChange={(e) => setNewRelease({...newRelease, minimumRequiredVersionCode: parseInt(e.target.value) || undefined})}
                        />
                        <TextField 
                            label="Min Recommended Version Code" 
                            type="number" 
                            fullWidth 
                            value={newRelease.minimumRecommendedVersionCode || ''}
                            onChange={(e) => setNewRelease({...newRelease, minimumRecommendedVersionCode: parseInt(e.target.value) || undefined})}
                        />
                        <TextField 
                            label="Release Notes" 
                            fullWidth 
                            multiline 
                            rows={3}
                            value={newRelease.releaseNotes}
                            onChange={(e) => setNewRelease({...newRelease, releaseNotes: e.target.value})}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRelease} variant="contained" color="primary" disabled={createMutation.isPending}>
                        Create & Continue
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({...snackbar, open: false})}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AppUpdatesPage;
