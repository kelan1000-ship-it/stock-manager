// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, BranchKey, OrderItem, Product, JointOrder } from '../types';
import { getProductMatchKey, findMatchByKey } from '../utils/productMatching';

export function useOrderManagement(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  // Standard Order Logic
  const removeOrder = useCallback((orderId: string) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].map((o: OrderItem) => 
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      )
    }));
  }, [currentBranch, setBranchData]);

  const markAsBackorder = useCallback((orderId: string) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].map((o: OrderItem) => 
        o.id === orderId ? { ...o, status: 'backorder' } : o
      )
    }));
  }, [currentBranch, setBranchData]);

  const markAsActiveOrder = useCallback((orderId: string) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].map((o: OrderItem) => 
        o.id === orderId ? { ...o, status: 'ordered' } : o
      )
    }));
  }, [currentBranch, setBranchData]);

  const receiveOrder = useCallback((order: OrderItem) => {
    const now = new Date().toISOString();
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    
    setBranchData(prev => {
        // Find ALL active orders for this product to prevent duplicate action bugs
        const activeOrders = prev[orderKey].filter((o: OrderItem) => 
            o.productId === order.productId && o.status !== 'completed' && o.status !== 'cancelled'
        );
        
        if (activeOrders.length === 0) return prev; // Already received or cancelled

        // Update product stock
        const updatedProducts = prev[currentBranch].map(p => {
            if (p.id === order.productId) {
                let currentStock = p.stockInHand;
                let newOrderHistory = [...(p.orderHistory || [])];
                let newStockHistory = [...(p.stockHistory || [])];

                activeOrders.forEach(activeOrder => {
                    currentStock += activeOrder.quantity;
                    newOrderHistory.push({ date: now, quantity: activeOrder.quantity });
                    newStockHistory.push({ 
                        date: now, 
                        type: 'order', 
                        change: activeOrder.quantity, 
                        newBalance: currentStock, 
                        note: 'Order Received' 
                    });
                });

                return {
                    ...p,
                    stockInHand: currentStock,
                    lastOrderedDate: now,
                    orderHistory: newOrderHistory,
                    stockHistory: newStockHistory
                };
            }
            return p;
        });

        // Update order statuses
        const activeOrderIds = new Set(activeOrders.map(o => o.id));
        const updatedOrders = prev[orderKey].map((o: OrderItem) => 
            activeOrderIds.has(o.id) ? { ...o, status: 'completed' } : o
        );

        return {
            ...prev,
            [currentBranch]: updatedProducts,
            [orderKey]: updatedOrders
        };
    });
  }, [currentBranch, setBranchData]);

  const confirmOrder = useCallback((orderId: string) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].map((o: OrderItem) =>
        o.id === orderId ? { ...o, status: 'ordered' } : o
      )
    }));
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

  const updateOrderQuantity = useCallback((orderId: string, newQuantity: number) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    setBranchData(prev => ({
      ...prev,
      [orderKey]: prev[orderKey].map((o: OrderItem) =>
        o.id === orderId ? { ...o, quantity: newQuantity } : o
      )
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
      productCode: item.productCode,
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

  const sendToRestock = useCallback((item: Product) => {
    setBranchData(prev => {
      const matchKey = getProductMatchKey(item);
      const existingRestock = (prev.jointOrders || []).find(
        o => o.status === 'restock' && matchKey && getProductMatchKey(o) === matchKey
      );

      if (existingRestock) {
        const requested = existingRestock.restockRequestedBy || [];
        if (requested.includes(currentBranch)) return prev;
        return {
          ...prev,
          jointOrders: prev.jointOrders.map(o =>
            o.id === existingRestock.id
              ? { ...o, restockRequestedBy: [...requested, currentBranch] }
              : o
          )
        };
      }

      const newOrder: JointOrder = {
        id: `joint_rst_${Date.now()}`,
        productId: item.id,
        name: item.name,
        barcode: item.barcode,
        productCode: item.productCode,
        packSize: item.packSize,
        totalQuantity: 0,
        allocationBywood: 0,
        allocationBroom: 0,
        status: 'restock',
        timestamp: new Date().toISOString(),
        restockRequestedBy: [currentBranch]
      };
      return {
        ...prev,
        jointOrders: [...(prev.jointOrders || []), newOrder]
      };
    });
  }, [currentBranch, setBranchData]);

  const sendToRestockWithQuantity = useCallback((item: Product, quantity: number) => {
    setBranchData(prev => {
      const matchKey = getProductMatchKey(item);
      const existing = (prev.jointOrders || []).find(
        o => o.status === 'restock' && matchKey && getProductMatchKey(o) === matchKey
      );
      const branchAllocKey = currentBranch === 'bywood' ? 'allocationBywood' : 'allocationBroom';

      if (existing) {
        return {
          ...prev,
          jointOrders: prev.jointOrders.map(o =>
            o.id === existing.id ? {
              ...o,
              [branchAllocKey]: quantity,
              totalQuantity: (currentBranch === 'bywood' ? quantity : o.allocationBywood)
                           + (currentBranch === 'broom' ? quantity : o.allocationBroom),
              restockRequestedBy: [...new Set([...(o.restockRequestedBy || []), currentBranch])]
            } : o
          )
        };
      }

      const newOrder: JointOrder = {
        id: `joint_rst_${Date.now()}`,
        productId: item.id,
        name: item.name,
        barcode: item.barcode,
        productCode: item.productCode,
        packSize: item.packSize,
        totalQuantity: quantity,
        allocationBywood: currentBranch === 'bywood' ? quantity : 0,
        allocationBroom: currentBranch === 'broom' ? quantity : 0,
        status: 'restock',
        timestamp: new Date().toISOString(),
        restockRequestedBy: [currentBranch]
      };
      return {
        ...prev,
        jointOrders: [...(prev.jointOrders || []), newOrder]
      };
    });
  }, [currentBranch, setBranchData]);

  const moveRestockToOrdered = useCallback((orderId: string, bywoodQty: number, broomQty: number) => {
    setBranchData(prev => ({
      ...prev,
      jointOrders: prev.jointOrders.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'pending_allocation' as const,
              allocationBywood: bywoodQty,
              allocationBroom: broomQty,
              totalQuantity: bywoodQty + broomQty,
            }
          : o
      )
    }));
  }, [setBranchData]);

  const dismissRestock = useCallback((orderId: string) => {
    setBranchData(prev => ({
      ...prev,
      jointOrders: prev.jointOrders.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' as const } : o
      )
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
        const broomProduct = findMatchByKey(prev.broom, jointOrder);
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
    markAsBackorder,
    markAsActiveOrder,
    receiveOrder,
    confirmOrder,
    sendToOrder,
    updateOrderQuantity,
    createJointOrder,
    updateJointOrder,
    distributeJointOrder,
    sendToRestock,
    sendToRestockWithQuantity,
    moveRestockToOrdered,
    dismissRestock
  };
}