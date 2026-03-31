
import React, { useCallback, useRef, useEffect } from 'react';
import { BranchData, BranchKey, Message, Product, Transfer } from '../types';
import { saveTransfer } from '../services/firestoreService';
import { findProductMatches } from '../utils/productMatching';

export function useMessageTransfer(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  // Queue for Firestore writes — kept outside the state updater to stay pure
  const pendingTransferWrites = useRef<Transfer[]>([]);

  // Flush queued writes after React commits the render
  useEffect(() => {
    const queue = pendingTransferWrites.current;
    if (queue.length === 0) return;
    pendingTransferWrites.current = [];
    queue.forEach(transfer => {
      saveTransfer(transfer).catch(err =>
        console.error('Transfer write failed for', transfer.id, err)
      );
    });
  });

  // ─── Messaging ──────────────────────────────────────────────────

  const markRead = useCallback(() => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.sender !== currentBranch ? { ...m, isRead: true } : m)
    }));
  }, [currentBranch, setBranchData]);

  const updateMessageReadStatus = useCallback((messageIds: string[]) => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => messageIds.includes(m.id) ? { ...m, isRead: true } : m)
    }));
  }, [setBranchData]);

  const toggleMessageReadStatus = useCallback((messageId: string) => {
    setBranchData(prev => {
      const msg = prev.messages.find(m => m.id === messageId);
      if (msg) {
        const isCurrentlyRead = msg.isRead;
        // If we are marking it as UNREAD (it was previously read)
        if (isCurrentlyRead) {
          try {
            const stored = localStorage.getItem('manualUnreadMessages');
            let overrides = JSON.parse(stored || '[]');
            if (!Array.isArray(overrides)) overrides = [];
            
            if (!overrides.includes(messageId)) {
              localStorage.setItem('manualUnreadMessages', JSON.stringify([...overrides, messageId]));
            }
          } catch (e) {
            console.error("Failed to update manual unread storage", e);
          }
        } else {
          // If we are marking it as READ (it was previously unread)
          try {
            const stored = localStorage.getItem('manualUnreadMessages');
            let overrides = JSON.parse(stored || '[]');
            if (Array.isArray(overrides)) {
              localStorage.setItem('manualUnreadMessages', JSON.stringify(overrides.filter((id: string) => id !== messageId)));
            }
          } catch (e) {
            console.error("Failed to update manual unread storage", e);
          }
        }
      }

      return {
        ...prev,
        messages: prev.messages.map(m => m.id === messageId ? { ...m, isRead: !m.isRead } : m)
      };
    });
  }, [setBranchData]);

  const sendMessage = useCallback((
    text: string, 
    file?: { fileName: string; fileSize: number; fileType: string; fileData: string }, 
    taskId?: string,
    reply?: { id: string; text: string; sender: BranchKey }
  ) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: currentBranch,
      text,
      timestamp: new Date().toISOString(),
      isRead: false,
      deletedBy: [],
      taskId,
      ...file,
      replyToId: reply?.id,
      replyToText: reply?.text,
      replyToSender: reply?.sender
    };
    setBranchData(prev => ({ ...prev, messages: [...prev.messages, newMsg] }));
  }, [currentBranch, setBranchData]);

  const sendNudge = useCallback((text: string) => {
    console.log("[useMessageTransfer] sendNudge called with:", text);
    try {
      const newMsg: Message = {
        id: `msg_nudge_${Date.now()}`,
        sender: currentBranch,
        text: text || "🔔 Attention required! (Nudge)",
        timestamp: new Date().toISOString(),
        isRead: false,
        isNudge: true,
        deletedBy: []
      };
      console.log("[useMessageTransfer] Creating nudge message:", newMsg);
      setBranchData(prev => {
        console.log("[useMessageTransfer] setBranchData updating messages. Prev count:", prev.messages.length);
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
    } catch (e) {
      console.error("[useMessageTransfer] sendNudge failed:", e);
    }
  }, [currentBranch, setBranchData]);

  const deleteMessage = useCallback((messageId: string) => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => 
        m.id === messageId 
          ? { ...m, deletedBy: [...(m.deletedBy || []), currentBranch] }
          : m
      )
    }));
  }, [currentBranch, setBranchData]);

  const clearAllMessages = useCallback(() => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => 
        (m.deletedBy || []).includes(currentBranch) 
          ? m 
          : { ...m, deletedBy: [...(m.deletedBy || []), currentBranch] }
      )
    }));
  }, [currentBranch, setBranchData]);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setBranchData(prev => ({
      ...prev,
      messages: prev.messages.map(m => {
        if (m.id !== messageId) return m;
        
        const currentReactions = m.reactions || {};
        const userReacted = currentReactions[emoji]?.includes(currentBranch);
        
        let newEmojiReactions;
        if (userReacted) {
          newEmojiReactions = currentReactions[emoji].filter(b => b !== currentBranch);
        } else {
          newEmojiReactions = [...(currentReactions[emoji] || []), currentBranch];
        }
          
        const newReactions = { ...currentReactions };
        if (newEmojiReactions.length === 0) {
          delete newReactions[emoji];
        } else {
          newReactions[emoji] = newEmojiReactions;
        }
        
        return { ...m, reactions: newReactions };
      })
    }));
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
        confirmedAt: action === 'confirmed' ? now : originalTransfer.confirmedAt,
      } as Transfer;

      // Queue the write — flushed by useEffect after render commit
      pendingTransferWrites.current.push(updatedTransfer);

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

        // Use robust matching (Barcode -> Name+PackSize)
        const targetProduct = { ...transfer } as unknown as Product;
        const existingMatches = findProductMatches(prev[receivingBranch], targetProduct);
        const existingIndex = existingMatches.length > 0 ? prev[receivingBranch].indexOf(existingMatches[0]) : -1;

        let updatedInventory = [...prev[receivingBranch]];

        if (existingIndex > -1) {
          const p = updatedInventory[existingIndex];
          updatedInventory[existingIndex] = {
            ...p,
            location: p.location === 'Received' ? '' : p.location,
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
          const sourceMatches = findProductMatches(prev[sendingBranch], targetProduct);
          const sourceProduct = sourceMatches.length > 0 ? sourceMatches[0] : undefined;

          const newProduct: Product = sourceProduct
            ? {
                ...sourceProduct,
                id: `tr_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                stockInHand: transfer.quantity,
                partPacks: transfer.partQuantity || 0,
                stockToKeep: 0,
                location: '',
                lastUpdated: now,
                createdAt: now,
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
                supplier: 'Transfer', location: '',
                lastUpdated: now,
                createdAt: now,
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
        const targetProduct = { ...transfer } as unknown as Product;
        const matches = findProductMatches(prev[fulfillingBranch], targetProduct);
        const matchId = matches.length > 0 ? matches[0].id : null;

        const updatedInventory = prev[fulfillingBranch].map(p => {
          if (matchId && p.id === matchId) {
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
        const targetProduct = { ...transfer } as unknown as Product;
        const matches = findProductMatches(prev[sourceBranch], targetProduct);
        const matchId = matches.length > 0 ? matches[0].id : null;

        const updatedInventory = prev[sourceBranch].map(p => {
          if (matchId && p.id === matchId) {
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

      // ─── CANCELLED (for requests): Refund if already confirmed ────
      if (action === 'cancelled' && transfer.type === 'request' && originalTransfer.status === 'confirmed') {
        const fulfillingBranch = transfer.targetBranch as BranchKey;
        const targetProduct = { ...transfer } as unknown as Product;
        const matches = findProductMatches(prev[fulfillingBranch], targetProduct);
        const matchId = matches.length > 0 ? matches[0].id : null;

        const updatedInventory = prev[fulfillingBranch].map(p => {
          if (matchId && p.id === matchId) {
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
                note: `Refund: Cancelled confirmed request from ${transfer.sourceBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
              }]
            };
          }
          return p;
        });

        return { ...prev, transfers: updatedTransfers, [fulfillingBranch]: updatedInventory };
      }

      // ─── CANCELLED (for pending requests): Just mark as cancelled ─
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

  const clearHistoricTransfers = useCallback(() => {
    setBranchData(prev => {
      let hasChanges = false;
      const updatedTransfers = prev.transfers.map(t => {
        const isHistoric = (t.targetBranch === currentBranch || t.sourceBranch === currentBranch) && 
                           (t.status === 'completed' || t.status === 'cancelled' || !!t.resolvedAt);
        const alreadyCleared = t.clearedBy?.includes(currentBranch);
        
        if (isHistoric && !alreadyCleared) {
          hasChanges = true;
          const updatedTransfer = {
            ...t,
            clearedBy: [...(t.clearedBy || []), currentBranch]
          };
          pendingTransferWrites.current.push(updatedTransfer);
          return updatedTransfer;
        }
        return t;
      });

      return hasChanges ? { ...prev, transfers: updatedTransfers } : prev;
    });
  }, [currentBranch, setBranchData]);

  return {
    markRead,
    updateMessageReadStatus,
    toggleMessageReadStatus,
    sendMessage,
    deleteMessage,
    clearAllMessages,
    toggleReaction,
    handleTransfer,
    processTransfer,
    sendNudge,
    getOtherBranchStock,
    clearHistoricTransfers
  };
}
