'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import ArrowForward from '@mui/icons-material/ArrowForward';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { signIn } from '@/app/login/actions';
import LegalLinks from '@/components/landing/LegalLinks';
import PaperAccent from '@/components/ui/icons/PaperAccent';
import HandDrawnArrow from '@/components/ui/icons/HandDrawnArrow';
import ActionButton from '@/components/shared/ActionButton';

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
    <Box
      sx={{
        position: 'relative',
        maxInlineSize: 640,
        marginInline: 'auto',
        paddingBlockStart: { xs: 1, md: 12.75 },
        paddingBlockEnd: { xs: 1, md: 0 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          insetBlockStart: { md: 575 },
          insetInlineEnd: { md: -250 },
          zIndex: 0,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <PaperAccent kind="pen" inlineSize={280} blockSize={250} sx={{ display: 'block' }} />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          insetBlockStart: { md: 210 },
          insetInlineStart: { md: -230 },
          zIndex: 0,
          display: { xs: 'none', lg: 'block' },
          transform: 'rotate(-8deg)',
        }}
      >
        <PaperAccent kind="stack" inlineSize={280} blockSize={250} sx={{ display: 'block' }} />
      </Box>
      <Typography
        aria-hidden="true"
        sx={{
          position: 'absolute',
          insetBlockStart: 250,
          insetInlineEnd: -230,
          inlineSize: 145,
          display: { xs: 'none', md: 'block' },
          fontFamily: 'var(--font-handwriting), cursive',
          fontSize: '1.75rem',
          lineHeight: 1.15,
          color: 'secondary.main',
          transform: 'rotate(-12deg)',
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {t('drawingNote')}
      </Typography>
      <HandDrawnArrow
        sx={{
          position: 'absolute',
          insetInlineEnd: -155,
          insetBlockStart: 380,
          inlineSize: 100,
          blockSize: 70,
          color: 'secondary.main',
          opacity: 0.6,
          display: { xs: 'none', md: 'block' },
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          insetInlineStart: -185,
          insetBlockStart: 520,
          display: { xs: 'none', lg: 'block' },
          color: 'secondary.main',
          transform: 'rotate(-12deg)',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.75rem',
            lineHeight: 1.1,
            whiteSpace: 'pre-line',
          }}
        >
          {t('saveProgressNote')}
        </Typography>
        <HandDrawnArrow
          sx={{
            inlineSize: 90,
            blockSize: 60,
            marginInlineStart: 8,
            transform: 'scaleX(-1) rotate(20deg)',
            opacity: 0.6,
          }}
        />
      </Box>
      <Paper
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 3, sm: 7 },
          paddingBlockStart: { md: 10 },
          paddingBlockEnd: { md: 9 },
          borderRadius: 4,
          boxShadow: 'none',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Stack sx={{ gap: { xs: 2.5, md: 3.5 } }}>
          <Stack sx={{ gap: 2.5, textAlign: 'center' }}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontSize: { xs: '2.25rem', sm: '3.125rem' },
                maxInlineSize: '15ch',
                mx: 'auto',
              }}
            >
              {t('title')}
            </Typography>
            <Typography color="text.secondary" sx={{ maxInlineSize: '46ch', mx: 'auto' }}>
              {t('body')}
            </Typography>
          </Stack>
          {!configured ? <Alert severity="info">{t('notConfigured')}</Alert> : null}
          <Box component="form" action="/auth/google" method="post">
            <ActionButton
              type="submit"
              tone="secondary"
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
              sx={{ minHeight: { xs: 50, md: 62 }, fontSize: { md: '1.125rem' } }}
            >
              {t('google')}
            </ActionButton>
          </Box>
          {!googleEnabled ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('googleUnavailable')}
            </Typography>
          ) : null}
          <Divider sx={{ typography: 'caption', color: 'text.secondary' }}>{t('or')}</Divider>
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
              placeholder={t('emailPlaceholder')}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { spellCheck: false } }}
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!configured || state === 'loading'}
            />
            <ActionButton
              type="submit"
              tone="primary"
              disabled={!configured || state === 'loading'}
              endIcon={<ArrowForward />}
              sx={{ minHeight: { xs: 50, md: 62 }, fontSize: { md: '1.125rem' } }}
            >
              {t(state === 'loading' ? 'sending' : 'send')}
            </ActionButton>
          </Stack>
          {state === 'sent' ? <Alert severity="success">{t('sent')}</Alert> : null}
          {state === 'error' ? <Alert severity="error">{t('error')}</Alert> : null}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              bgcolor: 'transparent',
              border: 0,
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                inlineSize: 52,
                blockSize: 52,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: 'tonal.primary',
                color: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <LockOutlined sx={{ fontSize: 26 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t('privacy')}
            </Typography>
          </Paper>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <LegalLinks />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
