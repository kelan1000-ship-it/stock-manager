import { useState, useEffect, useMemo, useCallback } from 'react';
import { EposZRead, EposTransaction, BranchKey } from '../types';
import { subscribeToEposZReads, saveEposZRead, deleteEposZRead } from '../services/firestoreService';

export function useEposZRead(currentBranch: BranchKey, allTransactions: EposTransaction[], operator: string) {
  const [pastZReads, setPastZReads] = useState<EposZRead[]>([]);

  useEffect(() => {
    const unsub = subscribeToEposZReads(currentBranch, (data) => {
      setPastZReads(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });
    return () => unsub();
  }, [currentBranch]);

  const lastZReadEnd = useMemo(() => {
    if (pastZReads.length === 0) return null;
    return pastZReads[0].periodEnd;
  }, [pastZReads]);

  const currentPeriodTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allTransactions.filter(t => {
      const txDate = t.timestamp.split('T')[0];
      if (txDate !== today) return false;
      if (lastZReadEnd && t.timestamp <= lastZReadEnd) return false;
      return true;
    });
  }, [allTransactions, lastZReadEnd]);

  const currentDaySummary = useMemo(() => {
    const nonVoided = currentPeriodTransactions.filter(t => !t.voided);
    const voided = currentPeriodTransactions.filter(t => t.voided);

    // Separate sale transactions and refund-type transactions
    const saleTxs = nonVoided.filter(t => t.type !== 'refund');
    const refundTxs = nonVoided.filter(t => t.type === 'refund');

    // Calculate gross sales (before item-level refunds)
    let totalSales = saleTxs.reduce((sum, t) => {
      const txRefunds = (t.refunds || []).reduce((s, r) => s + r.amount, 0);
      return sum + t.total - txRefunds;
    }, 0);

    // Subtract refund-type transactions from total sales
    totalSales -= refundTxs.reduce((sum, t) => sum + t.total, 0);

    // Payment breakdown: start with sale transaction totals
    let totalCash = saleTxs.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0);
    let totalCard = saleTxs.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + t.total, 0);
    let totalMixed = saleTxs.filter(t => t.paymentMethod === 'mixed').reduce((sum, t) => sum + t.total, 0);

    // Subtract item-level refunds from payment buckets by refund method
    saleTxs.forEach(t => {
      (t.refunds || []).forEach(r => {
        if (r.method === 'cash') totalCash -= r.amount;
        else if (r.method === 'card') totalCard -= r.amount;
      });
    });

    // Subtract refund-type transactions from their payment method bucket
    refundTxs.forEach(t => {
      if (t.paymentMethod === 'cash') totalCash -= t.total;
      else if (t.paymentMethod === 'card') totalCard -= t.total;
      else if (t.paymentMethod === 'mixed') totalMixed -= t.total;
    });

    // Items sold: exclude refunded items in sales, subtract refund-type transaction items
    const itemsSold = saleTxs.reduce((sum, t) =>
      sum + t.items.filter(i => !i.refunded).reduce((s, i) => s + i.quantity, 0), 0)
      - refundTxs.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

    // Top items: only non-refunded items from sales
    const itemMap = new Map<string, { name: string; quantity: number; total: number }>();
    saleTxs.forEach(t => t.items.filter(i => !i.refunded).forEach(i => {
      const key = i.productId || i.name;
      const existing = itemMap.get(key) || { name: i.name, quantity: 0, total: 0 };
      existing.quantity += i.quantity;
      existing.total += i.lineTotal;
      itemMap.set(key, existing);
    }));
    const topItems = [...itemMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    // Total refunded: item-level refunds + refund-type transactions
    const refundTxTotal = refundTxs.reduce((sum, t) => sum + t.total, 0);
    const totalRefunded = saleTxs.reduce((sum, t) =>
      sum + (t.refunds || []).reduce((s, r) => s + r.amount, 0), 0) + refundTxTotal;
    const refundCount = saleTxs.reduce((sum, t) => sum + (t.refunds?.length || 0), 0) + refundTxs.length;

    return {
      transactionCount: saleTxs.length,
      voidedCount: voided.length,
      totalSales, totalCash, totalCard, totalMixed, itemsSold, topItems,
      totalRefunded, refundCount,
    };
  }, [currentPeriodTransactions]);

  const generateZRead = useCallback(async () => {
    const now = new Date().toISOString();
    const periodStart = lastZReadEnd || new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const { transactionCount, voidedCount, totalSales, totalCash, totalCard, totalMixed, itemsSold, topItems, totalRefunded, refundCount } = currentDaySummary;

    if (transactionCount === 0 && voidedCount === 0 && refundCount === 0) return;

    const zRead: EposZRead = {
      id: crypto.randomUUID(),
      branch: currentBranch,
      periodStart,
      periodEnd: now,
      transactionCount,
      voidedCount,
      totalSales,
      totalCash,
      totalCard,
      totalMixed,
      itemsSold,
      topItems,
      totalRefunded,
      refundCount,
      operator,
      timestamp: now,
    };

    await saveEposZRead(currentBranch, zRead);
  }, [currentBranch, currentDaySummary, lastZReadEnd, operator]);

  const deleteZReadById = useCallback(async (id: string) => {
    await deleteEposZRead(currentBranch, id);
  }, [currentBranch]);

  const updateZRead = useCallback(async (zRead: EposZRead) => {
    await saveEposZRead(currentBranch, zRead);
  }, [currentBranch]);

  return { pastZReads, currentDaySummary, generateZRead, currentPeriodTransactions, deleteZRead: deleteZReadById, updateZRead };
}
