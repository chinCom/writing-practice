import { ImageResponse } from 'next/og';
import BrandIconImage from '@/components/ui/icons/BrandIconImage';

// The 192 and 512 sizes back the web app manifest; 32 is the browser tab icon.
const iconSizes = [32, 192, 512] as const;

export function generateImageMetadata() {
  return iconSizes.map((size) => ({
    id: String(size),
    contentType: 'image/png',
    size: { width: size, height: size },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  return new ImageResponse(<BrandIconImage rounded={size === 32} />, {
    width: size,
    height: size,
  });
}
