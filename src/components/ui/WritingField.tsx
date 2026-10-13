'use client';
import { forwardRef } from 'react';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
export const writingAttributes = {
  dir: 'ltr',
  spellCheck: false,
  autoCorrect: 'off',
  autoCapitalize: 'off',
  autoComplete: 'off',
  'data-gramm': 'false',
  'data-gramm_editor': 'false',
  'data-enable-grammarly': 'false',
} as const;
const WritingField = forwardRef<HTMLDivElement, TextFieldProps>(function WritingField(props, ref) {
  return (
    <TextField
      {...props}
      ref={ref}
      slotProps={{
        ...props.slotProps,
        htmlInput: {
          ...(typeof props.slotProps?.htmlInput === 'object' ? props.slotProps.htmlInput : {}),
          ...writingAttributes,
        },
      }}
    />
  );
});
export default WritingField;
