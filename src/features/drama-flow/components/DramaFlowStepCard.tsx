import type { ReactNode } from 'react';

import { DramaFlowStepIndicator } from '@/features/drama-flow/components/DramaFlowStepIndicator';
import { cn } from '@/utils';

type DramaFlowStepCardProps = {
  currentStep: 1 | 2 | 3;
  children: ReactNode;
};

export function DramaFlowStepCard({
  currentStep,
  children,
}: DramaFlowStepCardProps) {
  return (
    <section
      className={cn(
        'flex w-full flex-col rounded-2xl bg-card',
        'gap-6 p-6',
        'md:p-8',
      )}
    >
      <DramaFlowStepIndicator currentStep={currentStep} />
      {children}
    </section>
  );
}
