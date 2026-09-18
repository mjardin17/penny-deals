import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SpreadFinder, SpreadFinderPrefill } from "./SpreadFinder";
import { ProfitCalculator } from "./ProfitCalculator";
import { VeroCheckerTool } from "./VeroCheckerTool";
import { BoxemUngatingEngine } from "./BoxemUngatingEngine";
import { TemuSoldArbitrageScanner } from "./TemuSoldArbitrageScanner";
import { AlibabaArbitrageScanner } from "./AlibabaArbitrageScanner";

type ArbTab = "spread" | "profit" | "vero" | "boxem" | "temu" | "alibaba";

const TABS: { id: ArbTab; label: string; ai?: boolean }[] = [
  { id: "spread", label: "Spread Finder" },
  { id: "profit", label: "Profit Calculator" },
  { id: "vero", label: "VeRO Check", ai: true },
  { id: "boxem", label: "Amazon Ungating", ai: true },
  { id: "temu", label: "Temu Scanner", ai: true },
  { id: "alibaba", label: "Alibaba Scanner", ai: true },
];

function AiBanner() {
  return (
    <div role="note" className="mb-3 flex gap-2 rounded-xl border border-[#ff9f0a]/50 bg-[#ff9f0a]/10 p-3 text-xs text-[#ffd60a]">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        AI estimate from Gemini, not live marketplace data. Numbers here are never flagged as real spreads. Confirm with the
        Spread Finder or Seller Central before buying.
      </span>
    </div>
  );
}

export const ArbitrageHub: React.FC<{ prefill?: SpreadFinderPrefill; onNotify?: (msg: string) => void }> = ({ prefill, onNotify }) => {
  const [tab, setTab] = useState<ArbTab>("spread");
  const active = TABS.find((t) => t.id === tab)!;
  const noLister = () => onNotify?.("The listing tool isn't part of Penny Deals yet.");

  return (
    <div className="mb-4">
      <nav aria-label="Arbitrage tools" className="flex gap-1 mb-3 overflow-x-auto scrollbar-none bg-[#18181c] p-1.5 rounded-xl border border-[#2c2c35]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
            className={`shrink-0 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              tab === t.id ? "bg-[#222227] text-[#f5f5f7] border border-[#2c2c35]" : "text-[#92929d] hover:text-[#f5f5f7]"
            }`}
          >
            {t.label}
            {t.ai && <span className="ml-1 text-[9px] px-1 rounded bg-[#ff9f0a]/20 text-[#ff9f0a]">AI</span>}
          </button>
        ))}
      </nav>

      {active.ai && <AiBanner />}
      {tab === "spread" && <SpreadFinder prefill={prefill} />}
      {tab === "profit" && <ProfitCalculator prefill={prefill} />}
      {tab === "vero" && <VeroCheckerTool />}
      {tab === "boxem" && <BoxemUngatingEngine />}
      {tab === "temu" && <TemuSoldArbitrageScanner onSendToLister={noLister} />}
      {tab === "alibaba" && <AlibabaArbitrageScanner onSendToLister={noLister} />}
    </div>
  );
};
