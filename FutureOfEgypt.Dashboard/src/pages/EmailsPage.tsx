import { useState } from 'react';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { getEmails, sendEmail } from '../api/emailsApi';
import { EmailMessageStatus } from '../types/emails';
import { formatDateTime } from '../utils/dateUtils';

function parseEmails(value: string) {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function getEmailStatusLabel(status: EmailMessageStatus) {
  switch (status) {
    case EmailMessageStatus.Draft:
      return 'Draft';
    case EmailMessageStatus.Queued:
      return 'Queued';
    case EmailMessageStatus.Sent:
      return 'Sent';
    case EmailMessageStatus.Failed:
      return 'Failed';
    default:
      return 'Unknown';
  }
}

function getEmailStatusColor(status: EmailMessageStatus) {
  switch (status) {
    case EmailMessageStatus.Sent:
      return 'success';
    case EmailMessageStatus.Failed:
      return 'error';
    case EmailMessageStatus.Queued:
      return 'warning';
    default:
      return 'default';
  }
}

export function EmailsPage() {
  const queryClient = useQueryClient();

  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: emails,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['emails'],
    queryFn: getEmails,
  });

  const sendMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: async (result) => {
      setSuccessMessage(
        result.status === EmailMessageStatus.Sent
          ? 'Email sent successfully.'
          : 'Email record created. Sending failed until SMTP is configured.',
      );

      setFormError(null);
      setToEmails('');
      setCcEmails('');
      setBccEmails('');
      setSubject('');
      setBody('');

      await queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: () => {
      setSuccessMessage(null);
      setFormError('Failed to create email message.');
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedToEmails = parseEmails(toEmails);
    const parsedCcEmails = parseEmails(ccEmails);
    const parsedBccEmails = parseEmails(bccEmails);

    if (parsedToEmails.length === 0) {
      setSuccessMessage(null);
      setFormError('Please enter at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      setSuccessMessage(null);
      setFormError('Please enter email subject.');
      return;
    }

    if (!body.trim()) {
      setSuccessMessage(null);
      setFormError('Please enter email body.');
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    sendMutation.mutate({
      toEmails: parsedToEmails,
      ccEmails: parsedCcEmails,
      bccEmails: parsedBccEmails,
      subject: subject.trim(),
      body: body.trim(),
    });
  }

  const emailItems = emails ?? [];

  return (
    <>
      <PageHeader
        title="Emails"
        subtitle="Send and review company emails to external organizations."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' },
          gap: 2,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmailIcon color="primary" />
            <Typography variant="h6" component="h2">New Email</Typography>
          </Box>

          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="To"
              placeholder="company@example.com, another@example.com"
              value={toEmails}
              onChange={(event) => setToEmails(event.target.value)}
              aria-label="To email addresses (comma separated)"
              helperText="Separate multiple emails with commas"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="CC"
              placeholder="optional"
              value={ccEmails}
              onChange={(event) => setCcEmails(event.target.value)}
              aria-label="CC email addresses (optional)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="BCC"
              placeholder="optional"
              value={bccEmails}
              onChange={(event) => setBccEmails(event.target.value)}
              aria-label="BCC email addresses (optional)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              aria-label="Email subject"
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              multiline
              minRows={7}
              aria-label="Email body"
              required
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              endIcon={
                sendMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SendIcon />
                )
              }
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2">Email Records</Typography>

            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => {
                void refetch();
              }}
            >
              Refresh
            </Button>
          </Box>

          {isLoading && <LoadingState message="Loading emails..." />}

          {isError && (
            <ErrorState
              message="Failed to load emails."
              onRetry={() => {
                void refetch();
              }}
            />
          )}

          {!isLoading && !isError && emailItems.length === 0 && (
            <EmptyState
              title="No emails"
              description="No email records have been created yet."
            />
          )}

          {!isLoading &&
            !isError &&
            emailItems.map((email) => (
              <Box key={email.publicId}>
                <Box sx={{ py: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      {email.subject}
                    </Typography>

                    <Chip
                      size="small"
                      label={getEmailStatusLabel(email.status)}
                      color={getEmailStatusColor(email.status)}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    From: {email.fromEmail}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    To: {email.toEmails}
                  </Typography>

                  {email.ccEmails && (
                    <Typography variant="body2" color="text.secondary">
                      CC: {email.ccEmails}
                    </Typography>
                  )}

                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {email.body}
                  </Typography>

                  {email.errorMessage && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      {email.errorMessage}
                    </Alert>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Created: {formatDateTime(email.createdAtUtc ?? email.createdAt)}
                  </Typography>
                </Box>

                <Divider />
              </Box>
            ))}
        </Paper>
      </Box>
    </>
  );
}