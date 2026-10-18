'use client';
import NextLink from 'next/link';
import Button, { type ButtonProps } from '@mui/material/Button';
import { actionTones, type ActionTone } from './action-tones';

export type NavigationButtonProps = Omit<
  ButtonProps<'a'>,
  'variant' | 'color' | 'component' | 'href' | 'ref'
> & {
  href: string;
  prefetch?: boolean;
  tone?: ActionTone;
};

/** A button that navigates inside the app with client-side routing. */
export default function NavigationButton({
  href,
  prefetch,
  tone = 'quiet',
  ...props
}: NavigationButtonProps) {
  return (
    <Button
      {...props}
      {...actionTones[tone]}
      component={NextLink}
      href={href}
      prefetch={prefetch}
    />
  );
}
