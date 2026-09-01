import { cn } from '@/utils';

import { Topic1011ArkSection } from './components/Topic1011ArkSection';
import { Topic1011ClosingSection } from './components/Topic1011ClosingSection';
import { Topic1011FactsSection } from './components/Topic1011FactsSection';
import { Topic1011HeroSection } from './components/Topic1011HeroSection';
import { Topic1011RolesSection } from './components/Topic1011RolesSection';
import { Topic1011TrailerSection } from './components/Topic1011TrailerSection';

export function Topic1011View() {
  return (
    <div
      className={cn(
        // Layout & Positioning
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        // Visual — 浅色 #edf5ff；深色 story Bg #111113（Figma 7039:38309）
        'bg-topic-1011-surface',
      )}
    >
      <Topic1011HeroSection />
      <Topic1011FactsSection />
      <Topic1011RolesSection />
      <Topic1011TrailerSection />
      <Topic1011ArkSection />
      <Topic1011ClosingSection />
    </div>
  );
}
