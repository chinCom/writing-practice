'use client';
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

export default function WritingField({ ref, ...props }: TextFieldProps) {
  const htmlInput = props.slotProps?.htmlInput;
  return (
    <TextField
      {...props}
      ref={ref}
      slotProps={{
        ...props.slotProps,
        htmlInput: (ownerState) => ({
          ...(typeof htmlInput === 'function' ? htmlInput(ownerState) : htmlInput),
          ...writingAttributes,
        }),
      }}
    />
  );
}
