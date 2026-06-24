import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Divider, TextField, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import { PageHeader } from '../components/common/PageHeader';
import { AuthorizedAvatar } from '../components/common/AuthorizedAvatar';
import { AvatarPreviewModal } from '../components/profile/AvatarPreviewModal';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../app/ThemeContext';

export function ProfilePage() {
    const { isDark } = useThemeMode();
    const queryClient = useQueryClient();
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<{ url: string; altText: string; fallbackText: string } | null>(null);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        phoneNumber: ''
    });

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['myProfile'],
        queryFn: profileApi.getMyProfile
    });

    useEffect(() => {
        if (profile) {
            setEditForm({
                fullName: profile.fullName || '',
                email: profile.email || '',
                phoneNumber: profile.phoneNumber || ''
            });
        }
    }, [profile]);

    const uploadMutation = useMutation({
        mutationFn: profileApi.uploadProfilePhoto,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['myProfile'] });
            updateUser({ profilePhotoUrl: data.profilePhotoUrl, avatarRefreshKey: Date.now() });
            setUploadError(null);
        },
        onError: (err: any) => {
            setUploadError(err.response?.data || err.message || 'Failed to upload photo');
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: profileApi.updateProfile,
        onSuccess: (updatedProfile) => {
            queryClient.invalidateQueries({ queryKey: ['myProfile'] });
            updateUser({
                fullName: updatedProfile.fullName,
                email: updatedProfile.email
            });
            setIsEditing(false);
            setUploadError(null);
        },
        onError: (err: any) => {
            setUploadError(err.response?.data?.message || err.message || 'Failed to update profile');
        }
    });

    const removeMutation = useMutation({
        mutationFn: profileApi.removeProfilePhoto,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myProfile'] });
            updateUser({ profilePhotoUrl: null, avatarRefreshKey: Date.now() });
            setRemoveDialogOpen(false);
            setUploadError(null);
        },
        onError: (err: any) => {
            setUploadError(err.response?.data || err.message || 'Failed to remove photo');
            setRemoveDialogOpen(false);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            uploadMutation.mutate(file);
        }
    };

    const handleSaveProfile = () => {
        if (!editForm.fullName || !editForm.email) {
            setUploadError('Full Name and Email are required.');
            return;
        }
        updateProfileMutation.mutate(editForm);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !profile) {
        return (
            <Box sx={{ mt: 4 }}>
                <Typography color="error">Failed to load profile.</Typography>
            </Box>
        );
    }

    const photoUrl = user?.profilePhotoUrl;
    const fallbackText = user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U';

    return (
        <Box>
            <PageHeader
                title="My Profile"
                subtitle="Manage your personal information and preferences"
            />
            <Paper sx={{ p: 4, mt: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                    <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 300px' }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <AuthorizedAvatar
                            srcUrl={photoUrl}
                            refreshKey={user?.avatarRefreshKey}
                            fallbackText={fallbackText}
                            onClick={() => setPreviewAvatar({ url: photoUrl || '', altText: profile.fullName || 'User Profile', fallbackText })}
                            sx={{
                                width: 150,
                                height: 150,
                                mb: 2,
                                border: 4,
                                borderColor: 'primary.main',
                                fontSize: '4rem',
                                cursor: 'pointer',
                                '&:hover': {
                                    opacity: 0.8
                                }
                            }}
                        />
                        
                        <Button
                            variant="outlined"
                            startIcon={uploadMutation.isPending || removeMutation.isPending ? <CircularProgress size={20} /> : <EditIcon />}
                            onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                            disabled={uploadMutation.isPending || removeMutation.isPending}
                            sx={{
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                '&:hover': {
                                    borderColor: 'primary.dark',
                                    backgroundColor: isDark ? 'rgba(0, 240, 255, 0.05)' : 'rgba(24, 119, 242, 0.04)'
                                }
                            }}
                        >
                            {(uploadMutation.isPending || removeMutation.isPending) ? 'Processing...' : 'Edit'}
                        </Button>
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={Boolean(menuAnchorEl)}
                            onClose={() => setMenuAnchorEl(null)}
                        >
                            <MenuItem onClick={() => {
                                setMenuAnchorEl(null);
                                fileInputRef.current?.click();
                            }}>
                                <UploadIcon fontSize="small" sx={{ mr: 1 }} /> Change Photo
                            </MenuItem>
                            {photoUrl && (
                                <MenuItem onClick={() => {
                                    setMenuAnchorEl(null);
                                    setRemoveDialogOpen(true);
                                }} sx={{ color: 'error.main' }}>
                                    <CancelIcon fontSize="small" sx={{ mr: 1 }} /> Remove Photo
                                </MenuItem>
                            )}
                        </Menu>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={handleFileChange}
                        />
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>Personal Information</Typography>
                            {!isEditing ? (
                                <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                                    Edit Profile
                                </Button>
                            ) : (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button startIcon={<CancelIcon />} color="inherit" onClick={() => {
                                        setIsEditing(false);
                                        setEditForm({
                                            fullName: profile.fullName || '',
                                            email: profile.email || '',
                                            phoneNumber: profile.phoneNumber || ''
                                        });
                                        setUploadError(null);
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        variant="contained" 
                                        startIcon={updateProfileMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />} 
                                        onClick={handleSaveProfile}
                                        disabled={updateProfileMutation.isPending}
                                    >
                                        Save
                                    </Button>
                                </Box>
                            )}
                        </Box>
                        
                        {uploadError && (
                            <Typography color="error" sx={{ mb: 2 }}>{uploadError}</Typography>
                        )}
                        
                        <Divider sx={{ mb: 3 }} />
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Full Name</Typography>
                                {isEditing ? (
                                    <TextField 
                                        fullWidth 
                                        size="small" 
                                        value={editForm.fullName}
                                        onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                                        sx={{ mt: 1 }}
                                    />
                                ) : (
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{profile.fullName || 'N/A'}</Typography>
                                )}
                            </Box>
                            
                            <Box>
                                <Typography variant="caption" color="text.secondary">Email / Username</Typography>
                                {isEditing ? (
                                    <TextField 
                                        fullWidth 
                                        size="small" 
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                                        sx={{ mt: 1 }}
                                    />
                                ) : (
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{profile.email || 'N/A'}</Typography>
                                )}
                            </Box>
                            
                            <Box>
                                <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                                {isEditing ? (
                                    <TextField 
                                        fullWidth 
                                        size="small" 
                                        value={editForm.phoneNumber}
                                        onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})}
                                        sx={{ mt: 1 }}
                                    />
                                ) : (
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{profile.phoneNumber || 'N/A'}</Typography>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">Role</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'primary.main' }}>{profile.role}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {previewAvatar && (
                <AvatarPreviewModal
                    open={!!previewAvatar}
                    onClose={() => setPreviewAvatar(null)}
                    imageUrl={previewAvatar.url}
                    altText={previewAvatar.altText}
                    fallbackText={previewAvatar.fallbackText}
                />
            )}

            <Dialog
                open={removeDialogOpen}
                onClose={() => setRemoveDialogOpen(false)}
            >
                <DialogTitle>Remove Profile Photo</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove your profile photo?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
                    <Button 
                        color="error" 
                        variant="contained" 
                        onClick={() => removeMutation.mutate()}
                        disabled={removeMutation.isPending}
                    >
                        {removeMutation.isPending ? 'Removing...' : 'Remove Photo'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
