import { tokens } from '@/theme/tokens';

/**
 * The feather-quill mark as a static image for `next/og`, which cannot read CSS variables.
 * `rounded` suits browser tabs; home-screen icons are full-bleed because the platform masks them.
 */
export default function BrandIconImage({ rounded = false }: { rounded?: boolean }) {
  const cobalt = tokens.light.violet;
  const white = tokens.light.onPrimary;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: cobalt,
        borderRadius: rounded ? '22%' : 0,
      }}
    >
      <svg width="64%" height="64%" viewBox="0 0 24 24">
        <path
          d="M21.2 2.5c-.3-.4-1.3-.4-2.2-.2-7.8 1.3-13 5.5-14.7 12.3-.5 1.9-.4 3.7.2 4.8 1.6.2 3.6-.1 5.1-.7 6.3-2.3 10-7.9 11.4-14.8.1-.6.3-1.2.2-1.4Z"
          fill={white}
        />
        <path
          d="M2 23c2-6 5-10 10-13"
          fill="none"
          stroke={white}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="m14.3 8.6 3-2.1M12.7 11.9l3.6-1.6M11.2 15.2l3.2-1.2"
          fill="none"
          stroke={cobalt}
          strokeLinecap="round"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
