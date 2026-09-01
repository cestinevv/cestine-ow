import { createFileRoute } from '@tanstack/react-router';

import { validateLegalSearch } from '@/features/legal/legalSearch';
import { TermsOfServiceView } from '@/features/legal/TermsOfServiceView';

export const Route = createFileRoute('/terms')({
  validateSearch: validateLegalSearch,
  component: TermsOfServiceView,
});
