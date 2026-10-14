'use client';
import Box from '@mui/material/Box';
import { splitHintText } from '@/lib/hint-text';
export default function HintText({ text, terms = [] }: { text: string; terms?: string[] }) {
  return splitHintText(text, terms).map((part, index) =>
    part.highlight ? (
      <Box
        key={index}
        component="mark"
        sx={{
          bgcolor: 'highlighter.light',
          color: 'text.primary',
          fontWeight: 700,
          borderRadius: 0.5,
          px: 0.5,
          boxDecorationBreak: 'clone',
        }}
      >
        {part.text}
      </Box>
    ) : (
      part.text
    ),
  );
}
