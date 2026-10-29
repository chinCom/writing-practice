import LegalPage from '@/components/landing/LegalPage';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('privacy');
}
export default function PrivacyPage() {
  return <LegalPage document="privacy" />;
}
