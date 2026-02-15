
import React, { useCallback } from 'react';
import { BranchData, BranchKey, Message, Product, Transfer } from '../types';

export function useMessageTransfer(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  // ─── Messaging ──────────────────────────────────────────────────

  const markRead = useCallback(() => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.sender !== currentBranch ? { ...m, isRead: true } : m)
    }));
  }, [currentBranch, setBranchData]);

  const toggleMessageReadStatus = useCallback((messageId: string) => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === messageId ? { ...m, isRead: !m.isRead } : m)
    }));
  }, [setBranchData]);

  const sendMessage = useCallback((text: string) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: currentBranch,
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setBranchData(prev => ({ ...prev, messages: [...prev.messages, newMsg] }));
  }, [currentBranch, setBranchData]);

  // ─── Transfers ──────────────────────────────────────────────────

  const handleTransfer = useCallback((product: Product, quantity: number, partQuantity: number = 0, type: 'send' | 'request', note: string) => {
    const targetBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

    const newTransfer: Transfer = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      sourceBranch: currentBranch,
      targetBranch,
      barcode: product.barcode,
      name: product.name,
      packSize: product.packSize,
      quantity,
      partQuantity,
      timestamp: new Date().toISOString(),
      status: 'pending',
      note
    };

    setBranchData(prev => {
      const updatedTransfers = [...prev.transfers, newTransfer];

      if (type === 'send') {
        // Deduct stock from sender immediately
        return {
          ...prev,
          transfers: updatedTransfers,
          [currentBranch]: prev[currentBranch].map(p => {
            if (p.id === product.id) {
              const newStock = Math.max(0, p.stockInHand - quantity);
              const newParts = Math.max(0, (p.partPacks || 0) - partQuantity);
              return {
                ...p,
                stockInHand: newStock,
                partPacks: newParts,
                lastUpdated: new Date().toISOString(),
                stockHistory: [...(p.stockHistory || []), {
                  date: new Date().toISOString(),
                  type: 'transfer_out',
                  change: -quantity,
                  newBalance: newStock,
                  note: `Transfer to ${targetBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
                }]
              };
            }
            return p;
          })
        };
      }

      // Request: just log it, no stock changes yet
      return { ...prev, transfers: updatedTransfers };
    });
  }, [currentBranch, setBranchData]);

  const processTransfer = useCallback((transferId: string, action: 'confirmed' | 'completed' | 'cancelled', newQuantity?: number, newPartQuantity?: number, replyNote?: string) => {
    const now = new Date().toISOString();

    setBranchData(prev => {
      // Find the transfer BEFORE modifying it (use original data)
      const originalTransfer = prev.transfers.find(t => t.id === transferId);
      if (!originalTransfer) return prev;

      // Build the updated transfer with new status and resolvedAt timestamp
      // resolvedAt ensures the UI never shows this transfer as active again
      const updatedTransfer = {
        ...originalTransfer,
        status: action,
        quantity: newQuantity !== undefined ? newQuantity : originalTransfer.quantity,
        partQuantity: newPartQuantity !== undefined ? newPartQuantity : originalTransfer.partQuantity,
        replyNote: replyNote !== undefined ? replyNote : originalTransfer.replyNote,
        // Only mark as resolved for terminal states — 'confirmed' is intermediate
        // (dispatched, awaiting receipt) and must remain in the active list
        resolvedAt: (action === 'completed' || action === 'cancelled') ? now : originalTransfer.resolvedAt,
      } as Transfer;

      // Replace the transfer in the list
      const updatedTransfers = prev.transfers.map(t =>
        t.id === transferId ? updatedTransfer : t
      );

      // Use the updated transfer for quantity references
      const transfer = updatedTransfer;

      // ─── COMPLETED: Add stock to receiving branch ──────────
      if (action === 'completed') {
        const receivingBranch: BranchKey = (transfer.type === 'send') ? transfer.targetBranch as BranchKey : transfer.sourceBranch as BranchKey;
        const sendingBranch: BranchKey = (transfer.type === 'send') ? transfer.sourceBranch as BranchKey : transfer.targetBranch as BranchKey;

        const existingIndex = prev[receivingBranch].findIndex(p => p.barcode === transfer.barcode && !p.deletedAt);
        let updatedInventory = [...prev[receivingBranch]];

        if (existingIndex > -1) {
          const p = updatedInventory[existingIndex];
          updatedInventory[existingIndex] = {
            ...p,
            stockInHand: p.stockInHand + transfer.quantity,
            partPacks: (p.partPacks || 0) + (transfer.partQuantity || 0),
            lastUpdated: now,
            stockHistory: [...(p.stockHistory || []), {
              date: now,
              type: 'transfer_in',
              change: transfer.quantity,
              newBalance: p.stockInHand + transfer.quantity,
              note: `Transfer from ${sendingBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
            }]
          };
        } else {
          // Product doesn't exist at receiving branch — create it
          const sourceProduct = prev[sendingBranch].find(p => p.barcode === transfer.barcode && !p.deletedAt);

          const newProduct: Product = sourceProduct
            ? {
                ...sourceProduct,
                id: `tr_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                stockInHand: transfer.quantity,
                partPacks: transfer.partQuantity || 0,
                stockToKeep: 0,
                location: 'Received',
                lastUpdated: now,
                stockHistory: [{ date: now, type: 'transfer_in', change: transfer.quantity, newBalance: transfer.quantity, note: `Transfer from ${sendingBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}` }],
                isOrdered: false,
                orderHistory: [],
              }
            : {
                id: `tr_new_${Date.now()}`,
                name: transfer.name,
                barcode: transfer.barcode,
                packSize: transfer.packSize,
                stockInHand: transfer.quantity,
                partPacks: transfer.partQuantity || 0,
                price: 0, costPrice: 0, stockToKeep: 0,
                supplier: 'Transfer', location: 'Received',
                lastUpdated: now,
                stockHistory: [{ date: now, type: 'transfer_in', change: transfer.quantity, newBalance: transfer.quantity, note: `Transfer from ${sendingBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}` }],
                orderHistory: [], priceHistory: [],
                isOrdered: false, lastOrderedDate: null, productCode: '',
                productImage: null, stockType: 'retail',
                isDiscontinued: false, isShared: false,
                isPriceSynced: false, enableThresholdAlert: false
              } as Product;

          updatedInventory = [newProduct, ...updatedInventory];
        }

        return { ...prev, transfers: updatedTransfers, [receivingBranch]: updatedInventory };
      }

      // ─── CONFIRMED (for requests): Deduct stock from fulfilling branch ─
      if (action === 'confirmed' && transfer.type === 'request') {
        const fulfillingBranch = transfer.targetBranch as BranchKey;

        const updatedInventory = prev[fulfillingBranch].map(p => {
          if (p.barcode === transfer.barcode && !p.deletedAt) {
            const newStock = Math.max(0, p.stockInHand - transfer.quantity);
            return {
              ...p,
              stockInHand: newStock,
              partPacks: Math.max(0, (p.partPacks || 0) - (transfer.partQuantity || 0)),
              lastUpdated: now,
              stockHistory: [...(p.stockHistory || []), {
                date: now,
                type: 'transfer_out',
                change: -transfer.quantity,
                newBalance: newStock,
                note: `Fulfilling request from ${transfer.sourceBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
              }]
            };
          }
          return p;
        });

        return { ...prev, transfers: updatedTransfers, [fulfillingBranch]: updatedInventory };
      }

      // ─── CANCELLED (for sends): Refund stock to sender ────
      if (action === 'cancelled' && transfer.type === 'send') {
        const sourceBranch = transfer.sourceBranch as BranchKey;

        const updatedInventory = prev[sourceBranch].map(p => {
          if (p.barcode === transfer.barcode && !p.deletedAt) {
            return {
              ...p,
              stockInHand: p.stockInHand + transfer.quantity,
              partPacks: (p.partPacks || 0) + (transfer.partQuantity || 0),
              lastUpdated: now,
              stockHistory: [...(p.stockHistory || []), {
                date: now,
                type: 'transfer_in',
                change: transfer.quantity,
                newBalance: p.stockInHand + transfer.quantity,
                note: `Refund: Cancelled transfer to ${transfer.targetBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
              }]
            };
          }
          return p;
        });

        return { ...prev, transfers: updatedTransfers, [sourceBranch]: updatedInventory };
      }

      // ─── CANCELLED (for requests): Just mark as cancelled ─
      return { ...prev, transfers: updatedTransfers };
    });
  }, [setBranchData]);

  // ─── Helper: Get other branch's stock for a barcode ─────────────
  // Used by the transfer inbox to show available stock at the partner branch
  const getOtherBranchStock = useCallback((barcode: string, branchData: BranchData): number => {
    const otherBranch: BranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
    const product = branchData[otherBranch].find(p => p.barcode === barcode && !p.deletedAt);
    return product ? product.stockInHand : 0;
  }, [currentBranch]);

  return {
    markRead,
    toggleMessageReadStatus,
    sendMessage,
    handleTransfer,
    processTransfer,
    getOtherBranchStock
  };
}
