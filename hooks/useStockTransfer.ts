
import { useState, useCallback } from 'react';
import { Transfer } from '../types';

interface UseStockTransferReturn {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  sendTransferToSheets: (transfer: Transfer) => Promise<boolean>;
  resetStatus: () => void;
}

/**
 * Hook to handle external logging of stock transfers to Google Sheets.
 */
export function useStockTransfer(): UseStockTransferReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetStatus = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setSuccess(false);
  }, []);

  const sendTransferToSheets = useCallback(async (transfer: Transfer): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Replace this with your actual Google Apps Script Web App URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    // MOCK DATA Fallback
    if (APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
      console.warn('Apps Script URL not configured for transfers. Simulating success.');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setIsSubmitting(false);
      return true;
    }

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'LOG_TRANSFER',
          ...transfer,
          timestamp: new Date().toISOString()
        }),
      });

      setSuccess(true);
      return true;
    } catch (err: any) {
      console.error('Transfer Logging Error:', err);
      setError(err.message || 'Failed to send data to Google Sheets.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    error,
    success,
    sendTransferToSheets,
    resetStatus
  };
}
