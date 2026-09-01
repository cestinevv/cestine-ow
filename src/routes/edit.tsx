import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { EditView } from '@/features/edit/EditView';

const editSearchSchema = z.object({
  dramaId: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const text = String(value).trim();

    return text.length > 0 ? text : undefined;
  }, z.string().min(1).optional()),
});

export const Route = createFileRoute('/edit')({
  validateSearch: (search) => editSearchSchema.parse(search),
  component: EditRouteGuard,
});

function EditRouteGuard() {
  return (
    <AppLoginPromptGate>
      <EditView />
    </AppLoginPromptGate>
  );
}
