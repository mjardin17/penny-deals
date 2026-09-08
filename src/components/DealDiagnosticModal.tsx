import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Zap,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { analyzeDealDiagnostic, DealDiagnosticReport } from '../utils/dealDiagnostic';

interface DealDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    category?: string;
    store?: string;
    upc?: string;
  } | null;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
}

export const DealDiagnosticModal: React.FC<DealDiagnosticModalProps> = ({
  isOpen,
  onClose,
  deal,
  onAddToCart,
  onLoadIntoCalculator,
}) => {
  if (!isOpen || !deal) return null;

  const report: DealDiagnosticReport = analyzeDealDiagnostic(
    deal.title,
    deal.buyPrice,
    deal.sellPrice,
    deal.category || 'General',
    deal.store || 'Retail'
  );

  const getTierBadge = (tier: DealDiagnosticReport['ratingTier']) => {
    switch (tier) {
      case 'Elite S-Tier':
        return 'bg-[#30d158]/20 text-[#30d158] border-[#30d158]/40';
      case 'Solid Winner':
        return 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40';
      case 'Moderate Flip':
        return 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/40';
      case 'High Risk / Speculative':
        return 'bg-[#ff9f0a]/20 text-[#ff9f0a] border-[#ff9f0a]/40';
      default:
        return 'bg-[#ff453a]/20 text-[#ff453a] border-[#ff453a]/40';
    }
  };

  const getRiskBadge = (risk: DealDiagnosticReport['priceTankingRisk']) => {
    if (risk === 'Low Risk') return 'text-[#30d158] bg-[#30d158]/10 border-[#30d158]/30';
    if (risk === 'Moderate Risk') return 'text-[#ffd60a] bg-[#ffd60a]/10 border-[#ffd60a]/30';
    return 'text-[#ff453a] bg-[#ff453a]/10 border-[#ff453a]/30';
  };

  const estProfit = Math.max(0, deal.sellPrice * 0.86 - (deal.buyPrice <= 0.04 ? 4.5 : 5.5) - deal.buyPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#121215] border-b border-[#2c2c35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#f5f5f7] flex items-center gap-2">
                <span>AI Deal Diagnostic & Velocity Engine</span>
              </h3>
              <p className="text-[10px] text-[#92929d]">
                Automated risk assessment, brand gating check & sales velocity model
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#92929d] hover:text-[#f5f5f7] hover:bg-[#222227] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Target Item Headline */}
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35]">
            <span className="text-[10px] font-bold text-[#92929d] uppercase tracking-wider block mb-1">
              Analyzing Sourcing Target
            </span>
            <h4 className="font-bold text-[#f5f5f7] text-sm leading-snug">{deal.title}</h4>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#92929d] flex-wrap">
              <span>
                Store: <strong className="text-[#ffd60a]">{deal.store || 'Retail Clearance'}</strong>
              </span>
              <span>
                Buy: <strong className="text-[#30d158] font-mono">${deal.buyPrice.toFixed(2)}</strong>
              </span>
              <span>
                Sell Comp: <strong className="text-[#0a84ff] font-mono">${deal.sellPrice.toFixed(2)}</strong>
              </span>
              <span>
                Est Net: <strong className="text-[#30d158] font-mono">+${estProfit.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* Composite Score & Tier */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] flex flex-col justify-between">
              <span className="text-[10px] text-[#92929d] font-bold uppercase">Arbitrage Score</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-3xl font-black text-[#f5f5f7] font-mono">{report.overallScore}</span>
                <span className="text-xs text-[#92929d]">/100</span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border text-center ${getTierBadge(report.ratingTier)}`}>
                {report.ratingTier}
              </span>
            </div>

            <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] flex flex-col justify-between">
              <span className="text-[10px] text-[#92929d] font-bold uppercase">Sales Velocity</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl font-black text-[#30d158] font-mono">{report.salesVelocityScore}</span>
                <span className="text-xs text-[#92929d]">pts</span>
              </div>
              <span className="text-[11px] text-[#f5f5f7] font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#30d158]" />
                <span>{report.estimatedDaysToSell}</span>
              </span>
            </div>
          </div>

          {/* Risk & Gating Grid */}
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] space-y-3">
            {/* Brand Gating */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#92929d] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0a84ff]" />
                  <span>Amazon / Marketplace Gating</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#222227] text-[#ffd60a] border border-[#ffd60a]/30">
                  {report.brandGatingStatus}
                </span>
              </div>
              <p className="text-[11px] text-[#92929d] leading-relaxed">{report.gatingNotes}</p>
            </div>

            <div className="border-t border-[#2c2c35]/60 pt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#92929d] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ff9f0a]" />
                  <span>Price Tanking Risk</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRiskBadge(report.priceTankingRisk)}`}>
                  {report.priceTankingRisk}
                </span>
              </div>
              <p className="text-[11px] text-[#92929d] leading-relaxed">{report.priceTankingReason}</p>
            </div>

            {/* Break Even Floor */}
            <div className="border-t border-[#2c2c35]/60 pt-2.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#92929d]">Break-Even Floor Price:</span>
                <p className="text-[10px] text-[#92929d]">Minimum resell before losing capital</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-[#ffd60a]">${report.breakEvenFloor.toFixed(2)}</span>
                <span className="text-[10px] text-[#30d158] block font-bold">+{report.marginOfSafetyPct}% Buffer</span>
              </div>
            </div>
          </div>

          {/* Recommended Liquidation Channel */}
          <div className="p-3 bg-[#0a84ff]/10 border border-[#0a84ff]/30 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-[#0a84ff] mb-1">
              <Package className="w-3.5 h-3.5" />
              <span>Recommended Sales Channel: {report.recommendedChannel}</span>
            </div>
            <p className="text-[11px] text-[#92929d] leading-relaxed">{report.channelReason}</p>
          </div>

          {/* Hunter Tactical Playbook */}
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] space-y-2">
            <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Hunter Tactical Execution Rules</span>
            </span>
            <ul className="space-y-1.5">
              {report.hunterTactics.map((tactic, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-[#f5f5f7]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                  <span>{tactic}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#121215] border-t border-[#2c2c35] flex items-center justify-end gap-2">
          {onLoadIntoCalculator && (
            <button
              type="button"
              onClick={() => {
                onLoadIntoCalculator(deal);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#30d158]" />
              <span>Fine-Tune in Calculator</span>
            </button>
          )}

          {onAddToCart && (
            <button
              type="button"
              onClick={() => {
                onAddToCart(deal);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Add to Sourcing Cart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
