import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

import {
  MINING_RULES_FAQ_ALL,
  MINING_RULES_FAQ_FEE,
  MINING_RULES_FAQ_SETTLEMENT,
  MINING_RULES_FAQ_STAMINA,
  MINING_RULES_FAQ_START,
  MINING_RULES_FAQ_TITLE_KEY,
  MINING_RULES_FAQ_UPGRADE,
  MINING_RULES_SUMMARY_KEYS,
  MiningRulesFaqId,
} from '../miningRulesContent';
import {
  BODY_TEXT_CLASS,
  MiningRulesFaqItem,
  MUTED_TEXT_CLASS,
} from './MiningRulesDialogParts';

type MiningRulesDialogBodyProps = {
  dialogOpen: boolean;
};

function FaqStartBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-0">
      {MINING_RULES_FAQ_START.bodyKeys.map((line) => (
        <p key={line} className={BODY_TEXT_CLASS}>
          {t(line)}
        </p>
      ))}
    </div>
  );
}

function FaqStaminaBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-0">
      {MINING_RULES_FAQ_STAMINA.rows.map((row) => (
        <p key={row} className={MUTED_TEXT_CLASS}>
          {t(row)}
        </p>
      ))}
    </div>
  );
}

function FaqFeeBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <p className={MUTED_TEXT_CLASS}>{t(MINING_RULES_FAQ_FEE.introKey)}</p>

      {MINING_RULES_FAQ_FEE.formulaRows.map((row) => (
        <p key={row} className={cn(MUTED_TEXT_CLASS, 'text-foreground/30')}>
          {t(row)}
        </p>
      ))}

      <p className={MUTED_TEXT_CLASS}>&nbsp;</p>

      <p className={BODY_TEXT_CLASS}>
        {t(MINING_RULES_FAQ_FEE.factorTableTitleKey)}
      </p>

      {MINING_RULES_FAQ_FEE.factorRows.map((row) => (
        <p key={row} className={MUTED_TEXT_CLASS}>
          {t(row)}
        </p>
      ))}

      <ul className="m-0 list-disc pl-5">
        {MINING_RULES_FAQ_FEE.priceFactorBullets.map((bullet) => (
          <li key={bullet} className={MUTED_TEXT_CLASS}>
            {t(bullet)}
          </li>
        ))}
      </ul>

      <p className={MUTED_TEXT_CLASS}>{t(MINING_RULES_FAQ_FEE.heatRowKey)}</p>
    </div>
  );
}

function FaqSettlementBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <p className={MUTED_TEXT_CLASS}>
        {t(MINING_RULES_FAQ_SETTLEMENT.introKey)}
      </p>
      <p className={MUTED_TEXT_CLASS}>&nbsp;</p>
      {MINING_RULES_FAQ_SETTLEMENT.distributionRows.map((row) => (
        <p key={row} className={MUTED_TEXT_CLASS}>
          {t(row)}
        </p>
      ))}
    </div>
  );
}

function FaqUpgradeBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <p className={MUTED_TEXT_CLASS}>{t(MINING_RULES_FAQ_UPGRADE.introKey)}</p>
      {MINING_RULES_FAQ_UPGRADE.pathRows.map((row) => (
        <p key={row} className={MUTED_TEXT_CLASS}>
          {t(row)}
        </p>
      ))}
    </div>
  );
}

function renderFaqBody(id: MiningRulesFaqId) {
  switch (id) {
    case MiningRulesFaqId.StartEarning:
      return <FaqStartBody />;
    case MiningRulesFaqId.Stamina:
      return <FaqStaminaBody />;
    case MiningRulesFaqId.FeeCalc:
      return <FaqFeeBody />;
    case MiningRulesFaqId.Settlement:
      return <FaqSettlementBody />;
    case MiningRulesFaqId.Upgrade:
      return <FaqUpgradeBody />;
  }
}

export function MiningRulesDialogBody({
  dialogOpen,
}: MiningRulesDialogBodyProps) {
  const { t } = useTranslation();

  // 默认全部收起；可同时展开多项
  const [openIds, setOpenIds] = useState<ReadonlySet<MiningRulesFaqId>>(
    () => new Set(),
  );

  // 关闭弹窗后重置，下次打开仍为全收起
  useEffect(() => {
    if (!dialogOpen) {
      setOpenIds(new Set());
    }
  }, [dialogOpen]);

  const handleToggleFaq = (id: MiningRulesFaqId) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Figma 1596:100598 — role-card 摘要 */}
      <div className="w-full rounded-xl bg-mining-card-surface p-3">
        <div className="flex flex-col gap-0">
          {MINING_RULES_SUMMARY_KEYS.map((line) => (
            <p key={line} className={BODY_TEXT_CLASS}>
              {t(line)}
            </p>
          ))}
        </div>
      </div>

      {/* FAQ 扁平列表 */}
      <div className="flex w-full flex-col gap-3">
        {MINING_RULES_FAQ_ALL.map((itemId) => (
          <div key={itemId} className="flex w-full flex-col gap-3">
            <div className="h-px w-full bg-mining-divider-border" />
            <MiningRulesFaqItem
              title={t(MINING_RULES_FAQ_TITLE_KEY[itemId])}
              open={openIds.has(itemId)}
              onToggle={() => {
                handleToggleFaq(itemId);
              }}
            >
              {renderFaqBody(itemId)}
            </MiningRulesFaqItem>
          </div>
        ))}
      </div>
    </div>
  );
}
