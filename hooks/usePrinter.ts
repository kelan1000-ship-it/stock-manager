import { useState, useCallback, useMemo } from 'react';
import { EposTransaction } from '../types';
import { BranchId, BRANCH_DETAILS } from '../types/auth';
import {
  connectPrinter as serviceConnect,
  connectPrinterUSB as serviceConnectUSB,
  disconnectPrinter as serviceDisconnect,
  isConnected,
  connectionType,
  safeOpenCashDrawer,
  safePrintReceipt,
  printReceiptViaBrowser,
} from '../services/printerService';

type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function usePrinter(currentBranch: BranchId) {
  const [status, setStatus] = useState<PrinterStatus>(
    isConnected() ? 'connected' : 'disconnected'
  );
  const [error, setError] = useState<string | null>(null);

  const isSerialSupported = useMemo(() => typeof navigator !== 'undefined' && !!navigator.serial, []);
  const isUSBSupported = useMemo(() => typeof navigator !== 'undefined' && !!navigator.usb, []);

  const branchDetails = useMemo(() => BRANCH_DETAILS[currentBranch], [currentBranch]);

  const connect = useCallback(async (baudRate = 9600) => {
    setStatus('connecting');
    setError(null);
    try {
      await serviceConnect(baudRate);
      setStatus('connected');
    } catch (e: any) {
      setError(e?.message || 'Connection failed');
      setStatus('error');
    }
  }, []);

  const connectUSB = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      await serviceConnectUSB();
      setStatus('connected');
    } catch (e: any) {
      setError(e?.message || 'USB connection failed');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await serviceDisconnect();
    setStatus('disconnected');
    setError(null);
  }, []);

  const openCashDrawer = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const result = await safeOpenCashDrawer();
    if (!result.ok && result.error) {
      setError(result.error);
      setStatus('error');
    }
    return result;
  }, []);

  const printReceipt = useCallback(async (transaction: EposTransaction, options?: { showVat?: boolean }): Promise<{ ok: boolean; error?: string }> => {
    const result = await safePrintReceipt(transaction, branchDetails, options);
    if (!result.ok && result.error) {
      setError(result.error);
      setStatus('error');
    }
    return result;
  }, [branchDetails]);

  const browserPrint = useCallback((transaction: EposTransaction, options?: { showVat?: boolean }): { ok: boolean; error?: string } => {
    const result = printReceiptViaBrowser(transaction, branchDetails, options);
    if (!result.ok && result.error) {
      setError(result.error);
    }
    return result;
  }, [branchDetails]);

  const activeConnectionType = status === 'connected' ? connectionType() : null;

  return {
    status,
    error,
    isSerialSupported,
    isUSBSupported,
    connect,
    connectUSB,
    disconnect,
    openCashDrawer,
    printReceipt,
    browserPrint,
    activeConnectionType,
  };
}
