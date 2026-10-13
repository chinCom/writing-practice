'use client';
import { useTranslations } from 'next-intl';
import type { TextFieldProps } from '@mui/material/TextField';
import WritingField from '@/components/ui/WritingField';

type WritingCanvasProps = Pick<TextFieldProps, 'value' | 'onChange' | 'inputRef' | 'disabled'> & {
  maxLength?: number;
};

export default function WritingCanvas({ maxLength = 1200, ...props }: WritingCanvasProps) {
  const t = useTranslations('studio');
  return (
    <WritingField
      {...props}
      multiline
      fullWidth
      variant="standard"
      slotProps={{
        input: {
          inputComponent: 'textarea',
          disableUnderline: true,
          sx: (theme) => ({
            ...theme.typography.canvas,
            color: theme.vars.palette.text.primary,
            alignItems: 'start',
            blockSize: {
              xs: theme.layout.writingCanvasMobileHeight,
              md: theme.layout.writingCanvasHeight,
            },
            paddingBlock: 0,
            '& textarea': {
              blockSize: '100%',
              boxSizing: 'border-box',
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              scrollbarGutter: 'stable',
              resize: 'none',
            },
          }),
        },
        htmlInput: { 'aria-label': t('writing'), maxLength },
      }}
    />
  );
}
