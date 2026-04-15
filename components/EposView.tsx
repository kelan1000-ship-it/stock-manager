import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Monitor, History, FileText, Settings, RotateCcw, Clock, Printer, ChevronDown, Usb, Cable, Banknote } from 'lucide-react';
import { BranchData, BranchKey, Product, EposTransaction, EposConfig } from '../types';
import { BranchId } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { useEpos } from '../hooks/useEpos';
import { useEposTransactions } from '../hooks/useEposTransactions';
import { useEposQuickButtons } from '../hooks/useEposQuickButtons';
import { useEposZRead } from '../hooks/useEposZRead';
import { usePrinter } from '../hooks/usePrinter';
import { subscribeToEposConfig } from '../services/firestoreService';
import { EposProductSearch } from './EposProductSearch';
import { EposCart } from './EposCart';
import { EposPaymentPanel } from './EposPaymentPanel';
import { EposMiscItemModal } from './EposMiscItemModal';
import { EposTransactionHistory } from './EposTransactionHistory';
import { EposZReadView } from './EposZReadView';
import { EposQuickButtonEditor } from './EposQuickButtonEditor';
import { EposEmailReceiptModal } from './EposEmailReceiptModal';
import { EposReceiptPrompt } from './EposReceiptPrompt';
import { StaffHoursView } from './StaffHoursView';

type EposSubView = 'register' | 'history' | 'z-read' | 'staff-hours';

interface EposViewProps {
  branchData: BranchData;
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  currentBranch: BranchKey;
}

function PrinterConnectionButton({ printer }: { printer: ReturnType<typeof usePrinter> }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSerial = printer.isSerialSupported;
  const hasUSB = printer.isUSBSupported;
  const hasBoth = hasSerial && hasUSB;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (!hasSerial && !hasUSB) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-400">
        <Printer size={14} />
        Browser Print Only
      </div>
    );
  }

  const statusDot = (
    <div className={`w-2 h-2 rounded-full ${
      printer.status === 'connected' ? 'bg-emerald-500' :
      printer.status === 'connecting' ? 'bg-amber-400 animate-pulse' :
      printer.status === 'error' ? 'bg-red-500' :
      'bg-gray-300'
    }`} />
  );

  const buttonClass = `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
    printer.status === 'connected'
      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
      : printer.status === 'connecting'
      ? 'bg-amber-50 border border-amber-200 text-amber-600'
      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
  }`;

  const connLabel = printer.status === 'connected'
    ? `Printer Connected${printer.activeConnectionType ? ` (${printer.activeConnectionType === 'usb' ? 'USB' : 'Serial'})` : ''}`
    : printer.status === 'connecting' ? 'Connecting...' : 'Connect Printer';

  const handleClick = () => {
    if (printer.status === 'connected') {
      printer.disconnect();
    } else if (hasBoth) {
      setShowMenu(prev => !prev);
    } else if (hasSerial) {
      printer.connect();
    } else {
      printer.connectUSB();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={handleClick} className={buttonClass}>
        {statusDot}
        <Printer size={14} />
        {connLabel}
        {hasBoth && printer.status !== 'connected' && printer.status !== 'connecting' && <ChevronDown size={12} />}
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px]">
          <button
            onClick={() => { setShowMenu(false); printer.connect(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Cable size={14} />
            Connect via Serial
          </button>
          <button
            onClick={() => { setShowMenu(false); printer.connectUSB(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <Usb size={14} />
            Connect via USB
          </button>
        </div>
      )}
    </div>
  );
}

export function EposView({ branchData, setBranchData, currentBranch }: EposViewProps) {
  const { isAdmin, firebaseUser } = useAuth();
  const [subView, setSubView] = useState<EposSubView>('register');
  const [isQuickButtonEditorOpen, setIsQuickButtonEditorOpen] = useState(false);
  const [emailReceiptTx, setEmailReceiptTx] = useState<EposTransaction | null>(null);
  const [variablePricePrompt, setVariablePricePrompt] = useState<{ label: string; productId?: string; noDiscountAllowed?: boolean; noVat?: boolean } | null>(null);
  const [variablePriceInput, setVariablePriceInput] = useState('');
  const [cartWidthPercent, setCartWidthPercent] = useState(60);
  const [eposConfig, setEposConfig] = useState<EposConfig | null>(null);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeToEposConfig(currentBranch, setEposConfig);
  }, [currentBranch]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rightPercent = ((rect.right - ev.clientX) / rect.width) * 100;
      setCartWidthPercent(Math.min(60, Math.max(30, rightPercent)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const operator = firebaseUser?.email || 'unknown';

  const epos = useEpos({ branchData, setBranchData, currentBranch, operator });
  const txHistory = useEposTransactions(currentBranch, setBranchData);
  const quickButtons = useEposQuickButtons(currentBranch);
  const zRead = useEposZRead(currentBranch, txHistory.allTransactions, operator);
  const printer = usePrinter(currentBranch as BranchId);

  const handleNoPrint = useCallback(async () => {
    await printer.openCashDrawer();
    epos.dismissReceipt();
  }, [printer, epos]);

  const handlePrintReceipt = useCallback(async () => {
    if (!epos.lastTransaction) return;
    const result = await printer.printReceipt(epos.lastTransaction);
    if (result.ok) {
      epos.dismissReceipt();
    } else {
      throw new Error(result.error || 'Print failed');
    }
  }, [printer, epos]);

  const handleBrowserPrint = useCallback(() => {
    if (!epos.lastTransaction) return;
    const result = printer.browserPrint(epos.lastTransaction);
    if (result.ok) {
      epos.dismissReceipt();
    }
  }, [printer, epos]);

  const handleEmailReceipt = useCallback(async () => {
    if (!epos.lastTransaction) return;
    await printer.openCashDrawer();
    setEmailReceiptTx(epos.lastTransaction);
    epos.dismissReceipt();
  }, [printer, epos]);

  const handleReprintReceipt = useCallback(async (tx: EposTransaction) => {
    if (printer.status === 'connected') {
      await printer.printReceipt(tx);
    } else {
      printer.browserPrint(tx);
    }
  }, [printer]);

  const handlePrintVatReceipt = useCallback(async (tx: EposTransaction) => {
    if (printer.status === 'connected') {
      await printer.printReceipt(tx, { showVat: true });
    } else {
      printer.browserPrint(tx, { showVat: true });
    }
  }, [printer]);

  const tabs: { key: EposSubView; label: string; icon: any }[] = [
    { key: 'register', label: 'Register', icon: Monitor },
    { key: 'history', label: 'History', icon: History },
    { key: 'z-read', label: 'Z-Read', icon: FileText },
    { key: 'staff-hours', label: 'Staff Hours', icon: Clock },
  ];

  return (
    <div className="w-full max-w-[99%] mx-auto p-2 sm:p-4 md:p-6">
      {/* Sub-view tabs */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex p-1 rounded-2xl bg-white border border-gray-200 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSubView(key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                subView === key ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Printer connection */}
        <div className="flex items-center gap-2">
          {printer.status === 'connected' && (
            <button
              onClick={() => printer.openCashDrawer()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-500 hover:bg-black hover:text-white hover:border-black transition-all"
              data-tooltip="Open Cash Drawer"
            >
              <Banknote size={14} />
              Cash Drawer
            </button>
          )}
          <PrinterConnectionButton printer={printer} />
        </div>
      </div>

      {/* Register View */}
      {subView === 'register' && (
        <div ref={containerRef} className="flex min-h-[calc(100vh-14rem)]">
          {/* Left panel - Search + Quick Buttons */}
          <div className="space-y-5 flex flex-col pr-0" style={{ width: `${100 - cartWidthPercent}%` }}>
            <EposProductSearch
              onAddToCart={epos.addToCart}
              onOpenMisc={() => epos.setIsMiscModalOpen(true)}
            />

            {/* Quick Buttons Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Quick Buttons</h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsQuickButtonEditorOpen(true)}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Settings size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {quickButtons.buttons.filter(b => b.isActive).map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      if (btn.variablePrice) {
                        setVariablePricePrompt({ label: btn.label, productId: btn.productId, noDiscountAllowed: btn.noDiscountAllowed, noVat: btn.noVat, reducedVat: btn.reducedVat });
                        setVariablePriceInput('');
                      } else {
                        epos.addQuickButtonItem(btn.label, btn.price, btn.productId, btn.noDiscountAllowed, btn.noVat, btn.reducedVat);
                      }
                    }}
                    className={`${btn.color} rounded-xl px-3 py-4 text-white text-left hover:opacity-90 active:scale-95 transition-all shadow-lg flex flex-col`}
                  >
                    <p className="font-bold text-sm truncate">{btn.label}</p>
                    {btn.description && (
                      <p className="text-white/70 text-[10px] leading-tight mt-1 line-clamp-2">{btn.description}</p>
                    )}
                    <p className="text-white/70 text-xs mt-auto pt-1">
                      {btn.variablePrice ? '£ Variable' : `£${(btn.price ?? 0).toFixed(2)}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={handleDragStart}
            className="w-[6px] mx-2 cursor-col-resize flex items-center justify-center group shrink-0"
          >
            <div className="w-[2px] h-16 rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors" />
          </div>

          {/* Right panel - Cart + Payment */}
          <div className={`bg-white border ${epos.isRefundMode ? 'border-orange-300' : 'border-gray-200'} rounded-[2rem] p-5 flex flex-col shadow-lg transition-colors`} style={{ width: `${cartWidthPercent}%` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-black text-sm uppercase tracking-widest ${epos.isRefundMode ? 'text-orange-600' : 'text-gray-900'}`}>
                {epos.isRefundMode ? 'Refund' : 'Cart'}
              </h3>
              <button
                onClick={epos.toggleRefundMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  epos.isRefundMode
                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <RotateCcw size={12} />
                {epos.isRefundMode ? 'Exit Refund' : 'Refund Mode'}
              </button>
            </div>
            <EposCart
              items={epos.cart}
              subtotal={epos.subtotal}
              total={epos.total}
              vatAmount={epos.vatAmount}
              discountPercent={epos.discountPercent}
              setDiscountPercent={epos.setDiscountPercent}
              discountAmount={epos.discountAmount}
              onUpdateQuantity={epos.updateQuantity}
              onRemove={epos.removeFromCart}
              onUpdateStock={epos.updateProductStock}
              isRefundMode={epos.isRefundMode}
              staffDiscountPercent={eposConfig?.staffDiscountPercent || 0}
            />
            <div className="border-t border-gray-200 pt-4 mt-4">
              <EposPaymentPanel
                total={epos.total}
                paymentMethod={epos.paymentMethod}
                setPaymentMethod={epos.setPaymentMethod}
                amountTendered={epos.amountTendered}
                setAmountTendered={epos.setAmountTendered}
                changeDue={epos.changeDue}
                canCompleteSale={epos.canCompleteSale}
                onCompleteSale={epos.completeSale}
                isRefundMode={epos.isRefundMode}
                onCompleteRefund={epos.completeRefund}
              />
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {subView === 'history' && (
        <EposTransactionHistory
          transactions={txHistory.transactions}
          dateFilter={txHistory.dateFilter}
          setDateFilter={txHistory.setDateFilter}
          onVoid={txHistory.voidTransaction}
          onDelete={txHistory.removeTransaction}
          onRefundItems={txHistory.refundItems}
          onEmailReceipt={setEmailReceiptTx}
          onReprintReceipt={handleReprintReceipt}
          onPrintVatReceipt={handlePrintVatReceipt}
          isAdmin={isAdmin}
        />
      )}

      {/* Z-Read View */}
      {subView === 'z-read' && (
        <EposZReadView
          currentDaySummary={zRead.currentDaySummary}
          pastZReads={zRead.pastZReads}
          onGenerateZRead={zRead.generateZRead}
          isAdmin={isAdmin}
          onDeleteZRead={zRead.deleteZRead}
          onEditZRead={zRead.updateZRead}
        />
      )}

      {/* Staff Hours View */}
      {subView === 'staff-hours' && (
        <StaffHoursView currentBranch={currentBranch} operator={operator} />
      )}

      {/* Misc Item Modal */}
      <EposMiscItemModal
        isOpen={epos.isMiscModalOpen}
        onClose={() => epos.setIsMiscModalOpen(false)}
        onAdd={epos.addMiscItem}
      />

      {/* Quick Button Editor */}
      <EposQuickButtonEditor
        isOpen={isQuickButtonEditorOpen}
        onClose={() => setIsQuickButtonEditorOpen(false)}
        buttons={quickButtons.buttons}
        onSave={quickButtons.saveButton}
        onDelete={quickButtons.removeButton}
        onReorder={quickButtons.reorderButtons}
      />

      {/* Receipt Prompt Modal */}
      {epos.lastTransaction && (
        <EposReceiptPrompt
          transaction={epos.lastTransaction}
          printerStatus={printer.status}
          onNoPrint={handleNoPrint}
          onPrintReceipt={handlePrintReceipt}
          onBrowserPrint={handleBrowserPrint}
          onEmailReceipt={handleEmailReceipt}
          onResumeCart={() => epos.resumeTransaction(epos.lastTransaction!)}
        />
      )}

      {/* Email Receipt Modal */}
      <EposEmailReceiptModal
        isOpen={!!emailReceiptTx}
        onClose={() => setEmailReceiptTx(null)}
        transaction={emailReceiptTx}
        branchId={currentBranch}
      />

      {/* Variable Price Prompt */}
      {variablePricePrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setVariablePricePrompt(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-gray-900 font-black text-sm mb-1">{variablePricePrompt.label}</h4>
            <p className="text-gray-400 text-xs mb-4">Enter the price for this item</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">£</span>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={variablePriceInput}
                onChange={(e) => setVariablePriceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const price = parseFloat(variablePriceInput);
                    if (price > 0) {
                      epos.addQuickButtonItem(variablePricePrompt.label, price, variablePricePrompt.productId, variablePricePrompt.noDiscountAllowed, variablePricePrompt.noVat, variablePricePrompt.reducedVat);
                      setVariablePricePrompt(null);
                    }
                  }
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const price = parseFloat(variablePriceInput);
                  if (price > 0) {
                    epos.addQuickButtonItem(variablePricePrompt.label, price, variablePricePrompt.productId, variablePricePrompt.noDiscountAllowed, variablePricePrompt.noVat, variablePricePrompt.reducedVat);
                    setVariablePricePrompt(null);
                  }
                }}
                disabled={!variablePriceInput || parseFloat(variablePriceInput) <= 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-300"
              >
                Add to Cart
              </button>
              <button
                onClick={() => setVariablePricePrompt(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
