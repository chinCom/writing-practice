'use client';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import DiamondOutlined from '@mui/icons-material/DiamondOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';

type LessonState = 'done' | 'current' | 'locked' | 'available';

const nodeSize = 36;
const drawLine = keyframes`
  from { transform: scaleY(0); }
`;
const pulseRing = keyframes`
  from { box-shadow: 0 0 0 0 var(--ring-color); }
  to { box-shadow: 0 0 0 12px transparent; }
`;
const visuallyHidden = {
  position: 'absolute',
  inlineSize: 1,
  blockSize: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

function NodeIcon({ state, checkpoint }: { state: LessonState; checkpoint: boolean }) {
  if (state === 'done') return <CheckCircle sx={{ color: 'success.main', fontSize: nodeSize }} />;
  const current = state === 'current';
  const Icon = state === 'locked' ? LockOutlined : DiamondOutlined;
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        '--ring-color': theme.vars.palette.secondary.main,
        inlineSize: nodeSize,
        blockSize: nodeSize,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: current ? 'primary.main' : checkpoint ? 'tonal.primary' : 'action.hover',
        color: current ? 'primary.contrastText' : 'text.secondary',
        outline: current ? '3px solid ' + theme.vars.palette.secondary.main : 'none',
        '@media (prefers-reduced-motion: no-preference)': current
          ? { animation: `${pulseRing} 1.4s ease-out 2 0.6s` }
          : {},
      })}
    >
      {state !== 'locked' && !checkpoint ? (
        <Box sx={{ inlineSize: 10, blockSize: 10, borderRadius: '50%', bgcolor: 'currentColor' }} />
      ) : (
        <Icon sx={{ fontSize: 20 }} />
      )}
    </Box>
  );
}

export default function PathNode({
  title,
  href,
  state,
  checkpoint,
  meta,
  last,
  order,
}: {
  title: string;
  href: string;
  state: LessonState;
  checkpoint: boolean;
  meta: ReactNode;
  last: boolean;
  order: number;
}) {
  const t = useTranslations('curriculum');
  return (
    <Box
      component="li"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: nodeSize + 'px minmax(0, 1fr)',
        columnGap: 2,
        paddingBlock: 1.5,
        paddingInline: 1,
        borderRadius: 2,
        bgcolor: state === 'current' ? 'tonal.primary' : 'transparent',
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'start center' }}>
        <NodeIcon state={state} checkpoint={checkpoint} />
      </Box>
      {!last ? (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            insetInlineStart: 8 + nodeSize / 2 - 1,
            insetBlockStart: 12 + nodeSize,
            insetBlockEnd: -12,
            inlineSize: 2,
            bgcolor: state === 'done' ? 'success.main' : 'divider',
            transformOrigin: 'top',
            '@media (prefers-reduced-motion: no-preference)':
              state === 'done'
                ? {
                    animation: `${drawLine} 300ms ease-out backwards`,
                    animationDelay: order * 90 + 'ms',
                  }
                : {},
          }}
        />
      ) : null}
      <Box sx={{ minInlineSize: 0, display: 'grid', gap: 0.5, justifyItems: 'start' }}>
        {state === 'locked' ? (
          <ButtonBase
            disabled
            sx={{ typography: 'subtitle1', color: 'text.disabled', textAlign: 'start' }}
          >
            {title}
            <Box component="span" sx={visuallyHidden}>
              {' · ' + t('locked')}
            </Box>
          </ButtonBase>
        ) : (
          <Button
            component={NextLink}
            href={href}
            variant={state === 'current' ? 'contained' : 'text'}
            sx={state === 'current' ? {} : { paddingInline: 0, justifyContent: 'start' }}
          >
            {title}
          </Button>
        )}
        <Typography variant="caption" color="text.secondary">
          {meta}
        </Typography>
      </Box>
    </Box>
  );
}
