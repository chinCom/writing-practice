import LegalPage from '@/components/landing/LegalPage';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('terms');
}
export default function TermsPage() {
  return <LegalPage document="terms" />;
}
