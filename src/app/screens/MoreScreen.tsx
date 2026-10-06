import React, { useState } from "react";
import { SpreadFinder } from "../../components/arbitrage/SpreadFinder";
import { ProfitCalculator } from "../../components/arbitrage/ProfitCalculator";
import { CouponsAdmin } from "../../components/CouponsAdmin";

type Tool = "spread" | "profit" | "coupons";

const TOOLS: { id: Tool; label: string; blurb: string }[] = [
  { id: "spread", label: "Spread finder", blurb: "Type an item and a price; get live eBay and Amazon numbers with real fees." },
  { id: "profit", label: "Profit calculator", blurb: "Compare eBay, Amazon and TikTok Shop side by side, with break-even prices." },
  { id: "coupons", label: "Coupons", blurb: "Your own coupon codes. Add the ones you find; the app shows them at the right store." },
];

export function MoreScreen() {
  const [tool, setTool] = useState<Tool>("spread");
  const [toast, setToast] = useState<string | null>(null);
  const active = TOOLS.find((t) => t.id === tool)!;

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Tools</h1>
        <p className="pd-lede">{active.blurb}</p>
      </div>
      <div className="pd-row" role="tablist" aria-label="Tools">
        {TOOLS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tool === t.id} className={`pd-btn pd-btn--small ${tool === t.id ? "" : "pd-btn--ghost"}`} onClick={() => setTool(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {toast && <div className="pd-banner pd-banner--info" role="status">{toast}</div>}
      {tool === "spread" && <SpreadFinder />}
      {tool === "profit" && <ProfitCalculator />}
      {tool === "coupons" && <CouponsAdmin onNotify={(msg) => setToast(msg)} />}
    </div>
  );
}
