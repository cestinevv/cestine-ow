import { useTranslation } from 'react-i18next';

import type { PlatformShareMetricRules } from '@/api/__generated__/wallet/model/platformShareMetricRules';
import { SubmitShareAttemptRequestPlatform } from '@/api/__generated__/wallet/model/submitShareAttemptRequestPlatform';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';

export function Story1011ShareRulesPanel({
  rulesByPlatform,
}: {
  rulesByPlatform:
    | Record<string, PlatformShareMetricRules | undefined>
    | undefined;
}) {
  const { t } = useTranslation();

  const platforms = [
    {
      platform: SubmitShareAttemptRequestPlatform.x,
      titleKey: 'X（Twitter）',
      showRetweet: true,
    },
    {
      platform: SubmitShareAttemptRequestPlatform.tiktok,
      titleKey: 'TikTok',
      showRetweet: false,
    },
    {
      platform: SubmitShareAttemptRequestPlatform.youtube,
      titleKey: 'YouTube',
      showRetweet: false,
    },
  ] as const;

  return (
    <aside
      className={cn(
        'flex w-full min-w-0 flex-1 flex-col gap-6 rounded border border-story-checkin-accent/16 bg-story-checkin-accent/5 p-4',
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-base leading-6 font-medium tracking-normal text-foreground">
          {t('传播数据加分标准')}
        </h3>
        <p className="m-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          {t('提交后获取验证码，写入对应平台内容简介即可完成验证')}
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        {platforms.map((item, index) => (
          <div key={item.platform} className="flex flex-col gap-2">
            {index > 0 ? <div className="h-px w-full bg-border" /> : null}
            <p className="m-0 text-[15px] leading-[22px] font-medium text-foreground">
              {t(item.titleKey)}
            </p>
            <ShareRulesRow
              rules={rulesByPlatform?.[item.platform]}
              showRetweet={item.showRetweet}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}

function ShareRulesRow({
  rules,
  showRetweet,
}: {
  rules: PlatformShareMetricRules | undefined;
  showRetweet: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <MetricRule
        label={t('每{{count}}次播放', {
          count: rules?.play?.threshold ?? '—',
        })}
        points={rules?.play?.points}
      />
      <MetricRule
        label={t('每{{count}}次点赞', {
          count: rules?.like?.threshold ?? '—',
        })}
        points={rules?.like?.points}
      />
      {showRetweet ? (
        <MetricRule
          label={t('每{{count}}次转推', {
            count: rules?.retweet?.threshold ?? '—',
          })}
          points={rules?.retweet?.points}
        />
      ) : null}
    </div>
  );
}

function MetricRule({
  label,
  points,
}: {
  label: string;
  points: number | undefined;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-clip rounded">
      <div className="flex flex-col justify-center text-muted-foreground">
        <span className="leading-5">{label}</span>
      </div>
      <div className="flex flex-col justify-center text-foreground">
        <span className="leading-5">
          {points === undefined ? '—' : `+${formatNumber(points)}`}
        </span>
      </div>
    </div>
  );
}
