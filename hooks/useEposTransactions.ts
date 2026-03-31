import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EposTransaction, EposCartItem, BranchKey, BranchData, StockMovement } from '../types';
import { subscribeToEposTransactions, saveEposTransaction, deleteEposTransaction } from '../services/firestoreService';

export function useEposTransactions(
  currentBranch: BranchKey,
  setBranchData?: React.Dispatch<React.SetStateAction<BranchData>>
) {
  const [transactions, setTransactions] = useState<EposTransaction[]>([]);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const unsub = subscribeToEposTransactions(currentBranch, setTransactions);
    return () => unsub();
  }, [currentBranch]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const txDate = t.timestamp.split('T')[0];
        return txDate >= dateFilter.start && txDate <= dateFilter.end;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [transactions, dateFilter]);

  const restoreStockForItems = useCallback((items: EposCartItem[], notePrefix: string) => {
    if (!setBranchData) return;
    const stockItems = items.filter(i => i.productId);
    if (stockItems.length === 0) return;
    setBranchData(prev => {
      const products = [...(prev[currentBranch] || [])];
      stockItems.forEach(cartItem => {
        const isLoose = cartItem.productId!.endsWith('__loose');
        const realId = isLoose ? cartItem.productId!.replace(/__loose$/, '') : cartItem.productId!;
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
            note: `${notePrefix} (Loose)`,
          };
          product.partPacks = currentPartPacks + cartItem.quantity;
          product.stockHistory = [...(product.stockHistory || []), movement];
        } else {
          const movement: StockMovement = {
            date: new Date().toISOString(),
            type: 'return',
            change: cartItem.quantity,
            newBalance: product.stockInHand + cartItem.quantity,
            note: notePrefix,
          };
          product.stockInHand = product.stockInHand + cartItem.quantity;
          product.stockHistory = [...(product.stockHistory || []), movement];
        }
        product.lastUpdated = new Date().toISOString();
        products[idx] = product;
      });
      return { ...prev, [currentBranch]: products };
    });
  }, [currentBranch, setBranchData]);

  const voidTransaction = useCallback(async (id: string, reason: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.voided) return;

    await saveEposTransaction(currentBranch, {
      ...tx,
      voided: true,
      voidedAt: new Date().toISOString(),
      voidReason: reason,
    });

    // Restore stock for non-refunded items (already-refunded items had stock restored at refund time)
    const itemsToRestore = tx.items.filter(i => !i.refunded);
    restoreStockForItems(itemsToRestore, `EPOS Void #${id.slice(0, 8)}`);
  }, [transactions, currentBranch, restoreStockForItems]);

  const removeTransaction = useCallback(async (id: string) => {
    await deleteEposTransaction(currentBranch, id);
  }, [currentBranch]);

  const refundItems = useCallback(async (transactionId: string, itemIds: string[], method: 'cash' | 'card') => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;

    const now = new Date().toISOString();
    const newRefunds: { itemId: string; amount: number; refundedAt: string; method: 'cash' | 'card' }[] = [];

    const updatedItems = tx.items.map(i => {
      if (itemIds.includes(i.id) && !i.refunded) {
        newRefunds.push({ itemId: i.id, amount: i.lineTotal, refundedAt: now, method });
        return { ...i, refunded: true, refundedAt: now, refundMethod: method };
      }
      return i;
    });

    await saveEposTransaction(currentBranch, {
      ...tx,
      items: updatedItems,
      refunds: [...(tx.refunds || []), ...newRefunds],
    });

    // Restore stock for refunded items
    const itemsToRestore = tx.items.filter(i => itemIds.includes(i.id) && !i.refunded);
    restoreStockForItems(itemsToRestore, `EPOS Refund #${transactionId.slice(0, 8)}`);
  }, [transactions, currentBranch, restoreStockForItems]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    dateFilter, setDateFilter,
    voidTransaction, removeTransaction, refundItems,
  };
}
