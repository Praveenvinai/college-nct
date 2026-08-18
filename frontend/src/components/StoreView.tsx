import React, { useState } from 'react';
import {
  ShoppingBag,
  Radio,
  Receipt,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { StoreItem, PurchaseRecord, PurchaseStatus } from '../types';

interface StoreViewProps {
  items: StoreItem[];
  purchaseHistory: PurchaseRecord[];
}

const CATEGORY_LABELS: Record<string, string> = {
  beverages: 'Cold Brew & Hydration',
  nutrition: 'Nootropic Focus Snacks',
  tech: 'Library Tech Essentials',
  stationery: 'College Leather & Paper'
};

/** Format a price in rupees, keeping whole numbers clean (₹15, not ₹15.00). */
const formatPrice = (value: number): string =>
  `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  Completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Dispensing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Pending: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
};

export const StoreView: React.FC<StoreViewProps> = ({
  items,
  purchaseHistory
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const availableCategories = items
    .map((i) => i.category)
    .filter((category, index, all) => all.indexOf(category) === index);
  const categories = [
    { id: 'all', label: 'All Dispenser Items' },
    ...availableCategories.map((id) => ({ id, label: CATEGORY_LABELS[id] ?? id }))
  ];

  const filteredItems =
    selectedCategory === 'all' ? items : items.filter((i) => i.category === selectedCategory);

  return (
    <div className="space-y-10">

      {/* Vending Dispenser Header Banner */}
      <div className="relative bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/50 shadow-2xl overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-[#383129] border border-[#524639] text-[#e0d7d0]">
              <ShoppingBag className="w-6 h-6" />
            </span>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#998f86]">
                Smart Store
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic">
                National College Smart Store
              </h2>
            </div>
          </div>
          <p className="text-xs text-[#998f86] max-w-xl font-medium leading-relaxed">
            Live dispenser stock and overall purchase activity. Press a physical
            button on the machine to dispense. This screen does not start a purchase.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-[#171614] border border-[#524639]/60 text-xs font-mono text-[#e0d7d0] flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="font-bold text-[#e0d7d0] text-xs">Live Firebase Inventory</p>
              <p className="text-[10px] text-[#998f86]">
                {items.length} slot{items.length === 1 ? '' : 's'} loaded
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 2 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                selectedCategory === cat.id
                  ? 'bg-[#e0d7d0] text-[#171614] shadow-lg font-bold'
                  : 'bg-[#221f1c] text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#2a2622] border border-[#524639]/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Product Inventory Grid */}
      {items.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[#221f1c] border border-[#524639]/50 text-center space-y-2">
          <p className="text-sm font-bold text-[#e0d7d0]">Live inventory unavailable</p>
          <p className="text-xs text-[#998f86]">
            The dispenser inventory could not be loaded from the campus backend.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isOut = item.stockCount <= 0;

            return (
              <div
                key={item.id}
                className={`bg-[#221f1c] rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group ${
                  isOut
                    ? 'border-[#524639]/30 opacity-60'
                    : 'border-[#524639]/50 hover:border-[#807368] hover:shadow-2xl'
                }`}
              >
                <div>
                  <div className="relative w-full h-48 bg-[#171614] overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-md font-mono ${
                          isOut
                            ? 'bg-[#171614]/90 text-rose-400 border-rose-500/40'
                            : 'bg-[#2a2622] text-[#e0d7d0] border-[#524639] font-bold'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-[#171614]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-[#524639]/60 text-[#e0d7d0] font-mono text-sm font-bold">
                      {formatPrice(item.price)}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-[#e0d7d0] font-['Outfit'] group-hover:text-white transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={isOut ? 'text-rose-400' : 'text-[#e0d7d0]'}>
                        {item.stockCount} available
                      </span>
                      {typeof item.dispenserSlot === 'number' && (
                        <>
                          <span className="text-[#524639]">•</span>
                          <span className="text-[#998f86]">
                            Physical Slot {item.dispenserSlot}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[#998f86] leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="w-full py-3 rounded-2xl text-xs font-bold bg-[#171614] text-[#807368] border border-[#524639]/30 flex items-center justify-center">
                    {isOut ? 'Restocking Soon' : 'Press machine button to dispense'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-8 rounded-3xl border border-slate-700/80 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Overall Store Purchase Activity
              </h3>
              <p className="text-xs text-slate-400">
                Live store_sales_log from the physical dispenser
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
            {purchaseHistory.length} Transaction{purchaseHistory.length === 1 ? '' : 's'} Recorded
          </span>
        </div>

        {purchaseHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No purchases logged yet. Press a physical button on the dispenser.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-mono text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3 rounded-l-xl">Item</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3 rounded-r-xl text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {purchaseHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 text-white font-bold">{tx.itemName}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">
                      {formatPrice(tx.price)}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {typeof tx.dispenserSlot === 'number'
                        ? `Slot ${tx.dispenserSlot}`
                        : tx.itemSlot ?? '—'}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {tx.purchaseMethod || 'Manual Button'}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{tx.timestamp}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[tx.status]}`}
                      >
                        {tx.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {tx.status === 'Failed' && <XCircle className="w-3 h-3" />}
                        {(tx.status === 'Pending' || tx.status === 'Dispensing') && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {tx.status === 'Completed' ? 'Dispensed' : tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
