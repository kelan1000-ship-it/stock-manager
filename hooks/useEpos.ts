import React, { useState, useCallback, useMemo } from 'react';
import { EposCartItem, EposTransaction, Product, BranchKey, BranchData, StockMovement } from '../types';
import { saveEposTransaction, deleteEposTransaction } from '../services/firestoreService';

interface UseEposParams {
  branchData: BranchData;
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  currentBranch: BranchKey;
  operator: string;
}

export function useEpos({ branchData, setBranchData, currentBranch, operator }: UseEposParams) {
  const [cart, setCart] = useState<EposCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [lastTransaction, setLastTransaction] = useState<EposTransaction | null>(null);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isRefundMode, setIsRefundMode] = useState(false);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  const discountableSubtotal = useMemo(() =>
    cart.filter(item => !item.noDiscountAllowed).reduce((sum, item) => sum + item.lineTotal, 0),
    [cart]
  );
  const discountAmount = discountableSubtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - total);

  const canCompleteSale = useMemo(() => {
    if (cart.length === 0) return false;
    if (paymentMethod === 'card' || paymentMethod === 'mixed') return true;
    return tenderedNum >= total;
  }, [cart, paymentMethod, tenderedNum, total]);

  const addToCart = useCallback((product: Product, opts?: { asLoose?: boolean }) => {
    const isLoose = opts?.asLoose;
    const parsePackSize = (ps: string): number => { const n = parseInt(ps); return isNaN(n) || n <= 0 ? 1 : n; };
    const unitPrice = isLoose
      ? (product.looseUnitPrice ?? (product.price / parsePackSize(product.packSize)))
      : product.price;
    const name = isLoose ? `${product.name} (Loose)` : product.name;
    const cartKey = isLoose ? `${product.id}__loose` : product.id;

    setCart(prev => {
      const existing = prev.find(item => item.productId === cartKey);
      if (existing) {
        return prev.map(item =>
          item.productId === cartKey
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        productId: cartKey,
        name,
        barcode: product.barcode,
        packSize: isLoose ? 'Loose' : product.packSize,
        unitPrice: Math.round(unitPrice * 100) / 100,
        quantity: 1,
        lineTotal: Math.round(unitPrice * 100) / 100,
        isMiscellaneous: false,
        noVat: product.noVat
      }];
    });
  }, []);

  const addMiscItem = useCallback((name: string, price: number, noVat?: boolean, noDiscountAllowed?: boolean) => {
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: null,
      name,
      unitPrice: price,
      quantity: 1,
      lineTotal: price,
      isMiscellaneous: true,
      noVat,
      noDiscountAllowed
    }]);
  }, []);

  const addQuickButtonItem = useCallback((label: string, price: number, productId?: string, noDiscountAllowed?: boolean, noVat?: boolean) => {
    if (productId) {
      const products = branchData[currentBranch] || [];
      const product = products.find(p => p.id === productId);
      if (product) {
        // Add to cart, then flag noDiscountAllowed if needed
        setCart(prev => {
          const existing = prev.find(item => item.productId === product.id);
          if (existing) {
            return prev.map(item =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
                : item
            );
          }
          return [...prev, {
            id: crypto.randomUUID(),
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            packSize: product.packSize,
            unitPrice: product.price,
            quantity: 1,
            lineTotal: product.price,
            isMiscellaneous: false,
            ...(noDiscountAllowed ? { noDiscountAllowed: true } : {}),
            noVat: product.noVat ?? noVat
          }];
        });
        return;
      }
    }
    // Misc item with noDiscountAllowed
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: null,
      name: label,
      unitPrice: price,
      quantity: 1,
      lineTotal: price,
      isMiscellaneous: true,
      ...(noDiscountAllowed ? { noDiscountAllowed: true } : {}),
      noVat
    }]);
  }, [branchData, currentBranch]);

  const updateQuantity = useCallback((cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== cartItemId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === cartItemId
        ? { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice }
        : item
    ));
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAmountTendered('');
    setPaymentMethod('cash');
    setDiscountPercent(0);
  }, []);

  const completeSale = useCallback(async () => {
    if (!canCompleteSale) return;

    const txId = crypto.randomUUID();
    
    let finalTendered = tenderedNum;
    let finalChange = 0;
    let cashAmount: number | undefined;
    let cardAmount: number | undefined;

    if (paymentMethod === 'card') {
      finalTendered = total;
      cardAmount = total;
    } else if (paymentMethod === 'mixed') {
      if (tenderedNum >= total) {
        // Effectively a cash sale with change
        finalChange = tenderedNum - total;
        cashAmount = total;
        finalTendered = tenderedNum;
      } else {
        // Split: Some cash, rest card
        cashAmount = tenderedNum;
        cardAmount = total - tenderedNum;
        finalTendered = total; // Total amount "given" is exactly the total
      }
    } else {
      // Cash
      finalChange = Math.max(0, tenderedNum - total);
      cashAmount = total;
      finalTendered = tenderedNum;
    }

    const vatAmount = cart.reduce((acc, item) => {
      if (item.noVat) return acc;
      // Apply discount if item allows it
      const itemFinalTotal = item.noDiscountAllowed 
        ? item.lineTotal 
        : item.lineTotal * (1 - (discountPercent / 100));
      return acc + (itemFinalTotal - (itemFinalTotal / 1.2));
    }, 0);

    const transaction: EposTransaction = {
      id: txId,
      branch: currentBranch,
      items: [...cart],
      subtotal,
      total,
      vatAmount: Math.round(vatAmount * 100) / 100,
      ...(discountPercent > 0 ? { discountPercent, discountAmount } : {}),
      amountTendered: finalTendered,
      changeDue: finalChange,
      cashAmount: cashAmount !== undefined ? Math.round(cashAmount * 100) / 100 : undefined,
      cardAmount: cardAmount !== undefined ? Math.round(cardAmount * 100) / 100 : undefined,
      paymentMethod,
      timestamp: new Date().toISOString(),
      operator,
    };

    // Deduct stock for non-misc items
    setBranchData(prev => {
      const products = [...(prev[currentBranch] || [])];
      cart.forEach(cartItem => {
        if (!cartItem.productId) return;
        const isLoose = cartItem.productId.endsWith('__loose');
        const realId = isLoose ? cartItem.productId.replace(/__loose$/, '') : cartItem.productId;
        const idx = products.findIndex(p => p.id === realId);
        if (idx === -1) return;
        const product = { ...products[idx] };
        if (isLoose) {
          const currentPartPacks = product.partPacks ?? 0;
          const newPartPacks = Math.max(0, currentPartPacks - cartItem.quantity);
          const movement: StockMovement = {
            date: new Date().toISOString(),
            type: 'sale',
            change: -cartItem.quantity,
            newBalance: newPartPacks,
            note: `EPOS Sale #${txId.slice(0, 8)} (Loose)`,
          };
          product.partPacks = newPartPacks;
          product.stockHistory = [...(product.stockHistory || []), movement];
        } else {
          const movement: StockMovement = {
            date: new Date().toISOString(),
            type: 'sale',
            change: -cartItem.quantity,
            newBalance: Math.max(0, product.stockInHand - cartItem.quantity),
            note: `EPOS Sale #${txId.slice(0, 8)}`,
          };
          product.stockInHand = Math.max(0, product.stockInHand - cartItem.quantity);
          product.stockHistory = [...(product.stockHistory || []), movement];
        }
        product.lastUpdated = new Date().toISOString();
        products[idx] = product;
      });
      return { ...prev, [currentBranch]: products };
    });

    await saveEposTransaction(currentBranch, transaction);
    setLastTransaction(transaction);
    clearCart();
  }, [canCompleteSale, cart, subtotal, total, amountTendered, paymentMethod, currentBranch, operator, setBranchData, clearCart, tenderedNum, discountPercent, discountAmount]);

  const toggleRefundMode = useCallback(() => {
    setIsRefundMode(prev => !prev);
    clearCart();
  }, [clearCart]);

  const completeRefund = useCallback(async () => {
    if (!canCompleteSale) return;

    const txId = crypto.randomUUID();
    
    let finalTendered = tenderedNum;
    let finalChange = 0;
    let cashAmount: number | undefined;
    let cardAmount: number | undefined;

    if (paymentMethod === 'card') {
      finalTendered = total;
      cardAmount = total;
    } else if (paymentMethod === 'mixed') {
      if (tenderedNum >= total) {
        finalChange = tenderedNum - total;
        cashAmount = total;
        finalTendered = tenderedNum;
      } else {
        cashAmount = tenderedNum;
        cardAmount = total - tenderedNum;
        finalTendered = total;
      }
    } else {
      finalChange = Math.max(0, tenderedNum - total);
      cashAmount = total;
      finalTendered = tenderedNum;
    }

    const vatAmount = cart.reduce((acc, item) => {
      if (item.noVat) return acc;
      // Apply discount if item allows it
      const itemFinalTotal = item.noDiscountAllowed 
        ? item.lineTotal 
        : item.lineTotal * (1 - (discountPercent / 100));
      return acc + (itemFinalTotal - (itemFinalTotal / 1.2));
    }, 0);

    const transaction: EposTransaction = {
      id: txId,
      branch: currentBranch,
      items: cart.map(item => ({ ...item, refunded: true, refundMethod: paymentMethod === 'mixed' ? 'cash' : paymentMethod })),
      subtotal,
      total,
      vatAmount: Math.round(vatAmount * 100) / 100,
      ...(discountPercent > 0 ? { discountPercent, discountAmount } : {}),
      amountTendered: finalTendered,
      changeDue: finalChange,
      cashAmount: cashAmount !== undefined ? Math.round(cashAmount * 100) / 100 : undefined,
      cardAmount: cardAmount !== undefined ? Math.round(cardAmount * 100) / 100 : undefined,
      paymentMethod,
      timestamp: new Date().toISOString(),
      operator,
      type: 'refund',
      refunds: cart.map(item => ({
        itemId: item.id,
        amount: item.lineTotal,
        refundedAt: new Date().toISOString(),
        method: (paymentMethod === 'mixed' ? 'cash' : (paymentMethod === 'card' ? 'card' : 'cash')),
      })),
    };

    // Restore stock for non-misc items
    setBranchData(prev => {
      const products = [...(prev[currentBranch] || [])];
      cart.forEach(cartItem => {
        if (!cartItem.productId) return;
        const isLoose = cartItem.productId.endsWith('__loose');
        const realId = isLoose ? cartItem.productId.replace(/__loose$/, '') : cartItem.productId;
        const idx = products.findIndex(p => p.id === realId);
        if (idx === -1) return;
        const product = { ...products[idx] };
        if (isLoose) {
          const currentPartPacks = product.partPacks ?? 0;
          const movement: StockMovement = {
            date: new Date().toISOString(),
            type: 'return',
            change: cartItem.quantity,
            newBalance: currentPartPacks + cartItem.quantity,
            note: `EPOS Refund #${txId.slice(0, 8)} (Loose)`,
          };
          product.partPacks = currentPartPacks + cartItem.quantity;
          product.stockHistory = [...(product.stockHistory || []), movement];
        } else {
          const movement: StockMovement = {
            date: new Date().toISOString(),
            type: 'return',
            change: cartItem.quantity,
            newBalance: product.stockInHand + cartItem.quantity,
            note: `EPOS Refund #${txId.slice(0, 8)}`,
          };
          product.stockInHand = product.stockInHand + cartItem.quantity;
          product.stockHistory = [...(product.stockHistory || []), movement];
        }
        product.lastUpdated = new Date().toISOString();
        products[idx] = product;
      });
      return { ...prev, [currentBranch]: products };
    });

    await saveEposTransaction(currentBranch, transaction);
    setLastTransaction(transaction);
    clearCart();
  }, [canCompleteSale, cart, subtotal, total, amountTendered, paymentMethod, currentBranch, operator, setBranchData, clearCart, tenderedNum, discountPercent, discountAmount]);

  const dismissReceipt = useCallback(() => setLastTransaction(null), []);

  const resumeTransaction = useCallback(async (tx: EposTransaction) => {
    // 1. Restore cart and payment settings
    setCart(tx.items);
    setPaymentMethod(tx.paymentMethod);
    setDiscountPercent(tx.discountPercent || 0);
    
    // Restore amountTendered based on payment method
    if (tx.paymentMethod === 'mixed') {
      setAmountTendered(tx.cashAmount?.toFixed(2) || '');
    } else if (tx.paymentMethod === 'card') {
      setAmountTendered('');
    } else {
      setAmountTendered(tx.amountTendered.toFixed(2));
    }

    // 2. Reverse stock deductions
    setBranchData(prev => {
      const products = [...(prev[currentBranch] || [])];
      tx.items.forEach(cartItem => {
        if (!cartItem.productId) return;
        const isLoose = cartItem.productId.endsWith('__loose');
        const realId = isLoose ? cartItem.productId.replace(/__loose$/, '') : cartItem.productId;
        const idx = products.findIndex(p => p.id === realId);
        if (idx === -1) return;
        
        const product = { ...products[idx] };
        const txSlug = tx.id.slice(0, 8);
        
        if (isLoose) {
          product.partPacks = (product.partPacks || 0) + cartItem.quantity;
          product.stockHistory = (product.stockHistory || []).filter(h => !h.note?.includes(`EPOS Sale #${txSlug}`));
        } else {
          product.stockInHand = (product.stockInHand || 0) + cartItem.quantity;
          product.stockHistory = (product.stockHistory || []).filter(h => !h.note?.includes(`EPOS Sale #${txSlug}`));
        }
        
        product.lastUpdated = new Date().toISOString();
        products[idx] = product;
      });
      return { ...prev, [currentBranch]: products };
    });

    // 3. Delete from Firestore
    await deleteEposTransaction(currentBranch, tx.id);

    // 4. Close popup
    setLastTransaction(null);
  }, [currentBranch, setBranchData]);

  return {
    cart, subtotal, total, itemCount, changeDue, canCompleteSale,
    discountPercent, setDiscountPercent, discountAmount,
    paymentMethod, setPaymentMethod,
    amountTendered, setAmountTendered,
    lastTransaction, dismissReceipt, resumeTransaction,
    isMiscModalOpen, setIsMiscModalOpen,
    addToCart, addMiscItem, addQuickButtonItem,
    updateQuantity, removeFromCart, clearCart,
    completeSale, completeRefund,
    isRefundMode, toggleRefundMode,
  };
}
