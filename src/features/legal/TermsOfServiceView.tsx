import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { TERMS_PAGE_TITLE_KEY, TERMS_SECTIONS } from './termsOfServiceSections';

export function TermsOfServiceView() {
  const { t } = useTranslation();

  return (
    <main
      className={cn(
        // Layout
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        // Spacing
        'py-8 md:py-12',
        // Visual
        'bg-background',
      )}
    >
      <ContentContainer
        className={cn(
          // Layout
          'mx-auto flex max-w-4xl flex-col',
          // Spacing
          'gap-8 px-4 md:px-8',
        )}
      >
        <h1 className="text-3xl leading-tight font-bold text-foreground md:text-4xl">
          {t(TERMS_PAGE_TITLE_KEY)}
        </h1>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground md:text-base">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.titleKey} className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-foreground">
                {t(section.titleKey)}
              </h2>

              {section.blocks.map((block) => {
                if (block.type === 'p') {
                  return <p key={block.textKey}>{t(block.textKey)}</p>;
                }

                return (
                  <ul
                    key={block.itemKeys[0] ?? section.titleKey}
                    className="flex list-none flex-col gap-2"
                  >
                    {block.itemKeys.map((itemKey) => (
                      <li key={itemKey}>{t(itemKey)}</li>
                    ))}
                  </ul>
                );
              })}
            </section>
          ))}
        </div>
      </ContentContainer>
    </main>
  );
}
