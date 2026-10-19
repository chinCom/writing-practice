'use client';

import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import PaperAccent, { type PaperIllustration } from '@/components/ui/icons/PaperAccent';
import SectionTitle from '@/components/shared/SectionTitle';

export default function OverviewCard({
  illustration,
  title,
  body,
  children,
}: {
  illustration: PaperIllustration;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        position: 'relative',
        overflow: 'clip',
        paddingInlineEnd: { md: 14 },
      }}
    >
      <PaperAccent
        kind={illustration}
        inlineSize={140}
        blockSize={140}
        sx={{ position: 'absolute', insetInlineEnd: -8, insetBlockStart: 16 }}
      />
      <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
        <BoardIcon
          name={illustration === 'targets' ? 'target' : illustration === 'bars' ? 'bars' : 'trend'}
          sx={{ color: 'secondary.main', fontSize: 24 }}
        />
        <SectionTitle>{title}</SectionTitle>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {body}
      </Typography>
      {children}
    </Paper>
  );
}
