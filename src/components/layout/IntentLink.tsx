'use client';

import { useState, type ComponentProps } from 'react';
import NextLink from 'next/link';

/** Warm private routes on hover or keyboard focus instead of every visible nav item. */
export default function IntentLink({
  onMouseEnter,
  onFocus,
  ...props
}: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
