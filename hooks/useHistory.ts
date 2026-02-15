
import { useState, useCallback, useMemo } from 'react';
import { Product, StockMovement, PriceHistoryEntry, OrderHistoryEntry } from '../types';

interface UseHistoryReturn {
  priceAdjustments: PriceHistoryEntry[];
  orderHistory: OrderHistoryEntry[];
  stockMovements: StockMovement[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: (product: Product) => Promise<void>;
  clearHistory: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [priceAdjustments, setPriceAdjustments] = useState<PriceHistoryEntry[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearHistory = useCallback(() => {
    setPriceAdjustments([]);
    setOrderHistory([]);
    setStockMovements([]);
    setError(null);
  }, []);

  const fetchHistory = useCallback(async (product: Product) => {
    setIsLoading(true);
    setError(null);

    // 1. Sync with local product data immediately
    setPriceAdjustments(product.priceHistory || []);
    setOrderHistory(product.orderHistory || []);
    setStockMovements(product.stockHistory || []);

    // 2. Fetch external supplemental data if configured
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    if (APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
      // If not configured, we just use local data. 
      // We simulate a small delay for realistic UX feeling
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=GET_HISTORY&barcode=${product.barcode}`);
      if (response.ok) {
        const data = await response.json();
        // Merge or replace local data with global sheet data if needed
        // For now, we just stick to local for speed and precision
      }
    } catch (err: any) {
      console.warn('External history sync skipped:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    priceAdjustments,
    orderHistory,
    stockMovements,
    isLoading,
    error,
    fetchHistory,
    clearHistory
  };
}
