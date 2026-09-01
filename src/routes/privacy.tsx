import { createFileRoute } from '@tanstack/react-router';

import { validateLegalSearch } from '@/features/legal/legalSearch';
import { PrivacyPolicyView } from '@/features/legal/PrivacyPolicyView';

export const Route = createFileRoute('/privacy')({
  validateSearch: validateLegalSearch,
  component: PrivacyPolicyView,
});
