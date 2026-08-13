import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wallet, 
  RefreshCw, 
  Sparkles, 
  Radio, 
  Receipt, 
  PackageCheck,
  Check,
  Building,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, StoreItem, PurchaseRecord } from '../types';

interface StoreViewProps {
  student: Student | null;
  items: StoreItem[];
  purchaseHistory: PurchaseRecord[];
  onPurchaseSuccess: (updatedStudentBalance: number, updatedItem: StoreItem, record: PurchaseRecord) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  student,
  items,
  purchaseHistory,
  onPurchaseSuccess
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [dispensingModalItem, setDispensingModalItem] = useState<StoreItem | null>(null);
  const [dispenseStep, setDispenseStep] = useState<'confirm' | 'signaling' | 'dispensing' | 'done'>('confirm');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Dispenser Items' },
    { id: 'beverages', label: 'Cold Brew & Hydration' },
    { id: 'nutrition', label: 'Nootropic Focus Snacks' },
    { id: 'tech', label: 'Library Tech Essentials' },
    { id: 'stationery', label: 'College Leather & Paper' },
  ];

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter((i) => i.category === selectedCategory);

  // Trigger Purchase Flow
  const handleInitiatePurchase = (item: StoreItem) => {
    setErrorMessage(null);
    if (!student) {
      setErrorMessage('Please sign in to purchase from the Smart Store.');
      return;
    }
    if (item.stockCount <= 0) {
      setErrorMessage("This item is currently out of stock in Dispenser #04.");
      return;
    }
    if (student.walletBalance < item.price) {
      setErrorMessage(`Insufficient wallet balance ($${student.walletBalance.toFixed(2)} available). Required: $${item.price.toFixed(2)}.`);
      return;
    }

    setDispensingModalItem(item);
    setDispenseStep('confirm');
  };

  // Confirm Dispense & Connect to IoT Controller
  const handleConfirmDispense = async () => {
    if (!student || !dispensingModalItem) return;

    setDispenseStep('signaling');
    setPurchasingItemId(dispensingModalItem.id);

    try {
      // Step 1: Simulate IoT signal transmission delay
      await new Promise((r) => setTimeout(r, 1000));
      setDispenseStep('dispensing');

      // Step 2: Call backend purchase API
      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          itemId: dispensingModalItem.id
        })
      });

      const data = await res.json();

      if (data.success) {
        await new Promise((r) => setTimeout(r, 1200));
        setDispenseStep('done');
        setPurchasingItemId(null);

        // Confetti celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#06B6D4']
        });

        onPurchaseSuccess(data.updatedBalance, data.updatedItem, data.purchaseRecord);
      } else {
        setErrorMessage(data.message || "Dispenser transaction failed.");
        setDispensingModalItem(null);
        setPurchasingItemId(null);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setErrorMessage("IoT network timeout. Please re-try scan.");
      setDispensingModalItem(null);
      setPurchasingItemId(null);
    }
  };

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
                {student ? 'Campus IoT Dispenser' : 'Smart Store'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic">
                National College Smart Store
              </h2>
            </div>
          </div>
          <p className="text-xs text-[#998f86] max-w-xl font-medium leading-relaxed">
            {student
              ? 'Automated dispenser reflecting physical stock loaded at Central Campus Station #04. Triggers physical IoT motor release instantly upon student authorization.'
              : 'Browse campus products and availability. Sign in to purchase items and access your wallet.'}
          </p>
        </div>

        {/* Live Dispenser Status Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-[#171614] border border-[#524639]/60 text-xs font-mono text-[#e0d7d0] flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="font-bold text-[#e0d7d0] text-xs">Station #04 Online</p>
              <p className="text-[10px] text-[#998f86]">IoT Ping: 12ms • Stock Auto-Synced</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
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

      {/* Product Inventory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isOut = item.stockCount <= 0;
          const isLow = item.stockCount > 0 && item.stockCount <= 3;

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
                {/* Product Image & Badge */}
                <div className="relative w-full h-48 bg-[#171614] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-md font-mono ${
                      isOut
                        ? 'bg-[#171614]/90 text-rose-400 border-rose-500/40'
                        : isLow
                        ? 'bg-[#383129] text-[#e0d7d0] border-[#807368] font-bold'
                        : 'bg-[#2a2622] text-[#e0d7d0] border-[#524639] font-bold'
                    }`}>
                      {item.badge} ({item.stockCount} left)
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 bg-[#171614]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-[#524639]/60 text-[#e0d7d0] font-mono text-sm font-bold">
                    ${item.price.toFixed(2)}
                  </div>
                </div>

                {/* Product Information */}
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-[#e0d7d0] font-['Outfit'] group-hover:text-white transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#998f86] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Buy Action Button */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => handleInitiatePurchase(item)}
                  disabled={isOut || purchasingItemId === item.id}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isOut
                      ? 'bg-[#171614] text-[#807368] border border-[#524639]/30 cursor-not-allowed'
                      : 'bg-[#e0d7d0] text-[#171614] hover:bg-white shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOut ? 'Restocking Soon' : 'Purchase & Dispense'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= PURCHASE HISTORY SECTION ================= */}
      {student && (
      <div className="glass-card p-8 rounded-3xl border border-slate-700/80 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Student Purchase History & Receipts
              </h3>
              <p className="text-xs text-slate-400">
                Real-time record of all items dispensed to student wallet ID ({student.id})
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
            {purchaseHistory.length} Transactions Recorded
          </span>
        </div>

        {purchaseHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No purchases logged yet. Select an item above to dispense from the machine.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-mono text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3 rounded-l-xl">Receipt ID</th>
                  <th className="p-3">Item Purchased</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Dispenser Location</th>
                  <th className="p-3 rounded-r-xl text-right">IoT Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {purchaseHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-amber-300 font-bold">{tx.id}</td>
                    <td className="p-3 text-white font-bold">{tx.itemName}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">${tx.price.toFixed(2)}</td>
                    <td className="p-3 text-slate-400 font-mono">{tx.timestamp}</td>
                    <td className="p-3 text-slate-300">{tx.location}</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* IoT Dispensing Modal Dialog */}
      {dispensingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-6 text-center relative">
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 glow-gold">
                {dispenseStep === 'confirm' && <ShoppingBag className="w-8 h-8" />}
                {dispenseStep === 'signaling' && <Radio className="w-8 h-8 animate-pulse text-cyan-400" />}
                {dispenseStep === 'dispensing' && <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />}
                {dispenseStep === 'done' && <PackageCheck className="w-8 h-8 text-emerald-400" />}
              </div>

              <h3 className="text-xl font-bold text-white font-['Outfit']">
                {dispenseStep === 'confirm' && 'Confirm Vending Purchase'}
                {dispenseStep === 'signaling' && 'Transmitting Signal to Dispenser #04...'}
                {dispenseStep === 'dispensing' && 'IoT Motor Releasing Item...'}
                {dispenseStep === 'done' && 'Item Dispensed!'}
              </h3>

              <p className="text-xs text-slate-300">
                {dispenseStep === 'confirm' && `Dispensing ${dispensingModalItem.name} for $${dispensingModalItem.price.toFixed(2)}.`}
                {dispenseStep === 'signaling' && 'Verifying student wallet NFC token & stock locking...'}
                {dispenseStep === 'dispensing' && 'Please collect item from tray at Dispenser Station #04.'}
                {dispenseStep === 'done' && 'Thank you! Purchase logged in your student portal history.'}
              </p>
            </div>

            {dispenseStep === 'confirm' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setDispensingModalItem(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDispense}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg glow-gold"
                >
                  Confirm & Dispense
                </button>
              </div>
            )}

            {dispenseStep === 'done' && (
              <button
                onClick={() => setDispensingModalItem(null)}
                className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-emerald-400"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
