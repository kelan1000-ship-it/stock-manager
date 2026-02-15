// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, BranchKey, OrderItem, Product, JointOrder } from '../types';

export function useOrderManagement(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  // Standard Order Logic
  const removeOrder = useCallback((orderId: string) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].filter((o: OrderItem) => o.id !== orderId)
    }));
  }, [currentBranch, setBranchData]);

  const receiveOrder = useCallback((order: OrderItem) => {
    const now = new Date().toISOString();
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    
    setBranchData(prev => {
        // Find order
        const targetOrder = prev[orderKey].find((o: OrderItem) => o.id === order.id);
        if (!targetOrder) return prev;

        // Update product stock
        const updatedProducts = prev[currentBranch].map(p => {
            if (p.id === targetOrder.productId) {
                return {
                    ...p,
                    stockInHand: p.stockInHand + targetOrder.quantity,
                    lastOrderedDate: now,
                    orderHistory: [...(p.orderHistory || []), { date: now, quantity: targetOrder.quantity }],
                    stockHistory: [...(p.stockHistory || []), { date: now, type: 'order', change: targetOrder.quantity, newBalance: p.stockInHand + targetOrder.quantity, note: 'Order Received' }]
                };
            }
            return p;
        });

        // Update order status
        const updatedOrders = prev[orderKey].map((o: OrderItem) => 
            o.id === order.id ? { ...o, status: 'completed' } : o
        );

        return {
            ...prev,
            [currentBranch]: updatedProducts,
            [orderKey]: updatedOrders
        };
    });
  }, [currentBranch, setBranchData]);

  const sendToOrder = useCallback((item: Product, quantity: number) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const newOrder: OrderItem = {
        id: `ord_${Date.now()}`,
        productId: item.id,
        name: item.name,
        barcode: item.barcode,
        packSize: item.packSize,
        supplier: item.supplier,
        quantity: quantity,
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    setBranchData(prev => ({
        ...prev,
        [orderKey]: [...prev[orderKey], newOrder]
    }));
  }, [currentBranch, setBranchData]);

  // Joint Order Logic
  const createJointOrder = useCallback((item: Product, totalQuantity: number, allocation?: { bywood: number, broom: number }) => {
    const now = new Date().toISOString();
    const newJointOrder: JointOrder = {
      id: `joint_ord_${Date.now()}`,
      productId: item.id,
      name: item.name,
      barcode: item.barcode,
      packSize: item.packSize,
      totalQuantity,
      allocationBywood: allocation?.bywood || 0,
      allocationBroom: allocation?.broom || 0,
      status: 'pending_allocation',
      timestamp: now
    };

    setBranchData(prev => ({
      ...prev,
      jointOrders: [...(prev.jointOrders || []), newJointOrder]
    }));
  }, [setBranchData]);

  const updateJointOrder = useCallback((id: string, updates: Partial<JointOrder>) => {
    setBranchData(prev => ({
        ...prev,
        jointOrders: prev.jointOrders.map(o => o.id === id ? { ...o, ...updates } : o)
    }));
  }, [setBranchData]);

  const distributeJointOrder = useCallback((orderId: string, qtyBywood: number, qtyBroom: number) => {
    setBranchData(prev => {
      const jointOrder = prev.jointOrders.find(o => o.id === orderId);
      if (!jointOrder) return prev;

      // Update joint order status
      const updatedJointOrders = prev.jointOrders.map(o => 
        o.id === orderId 
          ? { ...o, status: 'distributed', allocationBywood: qtyBywood, allocationBroom: qtyBroom } 
          : o
      );

      // Create Individual Branch Orders
      const newBywoodOrders = [...prev.bywoodOrders];
      const newBroomOrders = [...prev.broomOrders];
      const now = new Date().toISOString();
      
      if (qtyBywood > 0) {
        newBywoodOrders.push({
          id: `ord_dist_by_${Date.now()}`,
          productId: jointOrder.productId,
          name: jointOrder.name,
          barcode: jointOrder.barcode,
          packSize: jointOrder.packSize,
          supplier: 'Joint Dist.',
          quantity: qtyBywood,
          status: 'ordered',
          timestamp: now
        });
      }

      if (qtyBroom > 0) {
        const broomProduct = prev.broom.find(p => p.barcode === jointOrder.barcode);
        newBroomOrders.push({
          id: `ord_dist_br_${Date.now()}`,
          productId: broomProduct ? broomProduct.id : jointOrder.productId,
          name: jointOrder.name,
          barcode: jointOrder.barcode,
          packSize: jointOrder.packSize,
          supplier: 'Joint Dist.',
          quantity: qtyBroom,
          status: 'ordered',
          timestamp: now
        });
      }

      return {
        ...prev,
        jointOrders: updatedJointOrders as JointOrder[],
        bywoodOrders: newBywoodOrders,
        broomOrders: newBroomOrders
      };
    });
  }, [setBranchData]);

  return {
    removeOrder,
    receiveOrder,
    sendToOrder,
    createJointOrder,
    updateJointOrder,
    distributeJointOrder
  };
}