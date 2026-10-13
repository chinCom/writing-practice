'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { signIn } from '@/app/login/actions';
export default function Login({
  configured,
  callbackError = false,
  googleEnabled = false,
}: {
  configured: boolean;
  callbackError?: boolean;
  googleEnabled?: boolean;
}) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>(
    callbackError ? 'error' : 'idle',
  );
  async function submitEmail() {
    setState('loading');
    try {
      const result = await signIn({ provider: 'email', email });
      setState(result.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }
  return (
    <Paper
      variant="outlined"
      sx={{ maxInlineSize: 520, p: { xs: 2.5, sm: 4 }, marginInline: 'auto' }}
    >
      <Stack sx={{ gap: 2.5 }}>
        <Typography variant="h1">{t('title')}</Typography>
        <Typography color="text.secondary">{t('body')}</Typography>
        {!configured ? <Alert severity="info">{t('notConfigured')}</Alert> : null}
        <Box component="form" action="/auth/google" method="post">
          <Button
            type="submit"
            variant="outlined"
            fullWidth
            disabled={!configured || !googleEnabled || state === 'loading'}
            startIcon={
              <Box
                component="img"
                src="/brand/google-g.png"
                alt=""
                aria-hidden="true"
                sx={{
                  inlineSize: '1.25em',
                  blockSize: '1.25em',
                  objectFit: 'contain',
                  flex: 'none',
                }}
              />
            }
          >
            {t('google')}
          </Button>
        </Box>
        {!googleEnabled ? (
          <Typography variant="caption">{t('googleUnavailable')}</Typography>
        ) : null}
        <Divider />
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitEmail();
          }}
          sx={{ gap: 2 }}
        >
          <TextField
            label={t('email')}
            type="email"
            name="email"
            slotProps={{ htmlInput: { spellCheck: false } }}
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!configured || state === 'loading'}
          />
          <Button type="submit" variant="contained" disabled={!configured || state === 'loading'}>
            {t(state === 'loading' ? 'sending' : 'send')}
          </Button>
        </Stack>
        {state === 'sent' ? <Alert severity="success">{t('sent')}</Alert> : null}
        {state === 'error' ? <Alert severity="error">{t('error')}</Alert> : null}
        <Typography variant="caption">{t('privacy')}</Typography>
      </Stack>
    </Paper>
  );
}
