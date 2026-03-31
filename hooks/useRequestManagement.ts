
import React, { useCallback } from 'react';
import { BranchData, BranchKey, CustomerRequest, RequestFormData } from '../types';

export function useRequestManagement(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  requestFormData: RequestFormData,
  setRequestFormData: React.Dispatch<React.SetStateAction<RequestFormData>>,
  editingRequestId: string | null,
  setEditingRequestId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsAddingRequest: React.Dispatch<React.SetStateAction<boolean>>,
  initialRequestFormData: RequestFormData
) {

  const resetRequestForm = useCallback(() => {
    setRequestFormData(initialRequestFormData);
    setEditingRequestId(null);
    setIsAddingRequest(false);
  }, [setRequestFormData, setEditingRequestId, setIsAddingRequest, initialRequestFormData]);

  const handleSaveRequest = useCallback(() => {
    const newReq: CustomerRequest = {
        id: editingRequestId || `req_${Date.now()}`,
        ...requestFormData,
        status: requestFormData.status as 'pending' | 'ordered' | 'ready' | 'completed',
        timestamp: requestFormData.timestamp || new Date().toISOString(),
        quantityOrdered: editingRequestId ? (requestFormData.quantityOrdered ?? 0) : 0
    };
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    
    setBranchData(prev => {
        const list = prev[key];
        if (editingRequestId) {
            return { ...prev, [key]: list.map(r => r.id === editingRequestId ? newReq : r) };
        }
        return { ...prev, [key]: [newReq, ...list] };
    });
    resetRequestForm();
  }, [currentBranch, editingRequestId, requestFormData, resetRequestForm, setBranchData]);

  const handleDeleteRequest = useCallback((id: string, permanent: boolean) => {
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    setBranchData(prev => ({
        ...prev,
        [key]: prev[key].map(r => {
            if (r.id !== id) return r;
            if (permanent) return null;
            return { ...r, deletedAt: new Date().toISOString() };
        }).filter(Boolean) as CustomerRequest[]
    }));
  }, [currentBranch, setBranchData]);

  const handleRestoreRequest = useCallback((id: string) => {
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    setBranchData(prev => ({
        ...prev,
        [key]: prev[key].map(r => r.id === id ? { ...r, deletedAt: undefined } : r)
    }));
  }, [currentBranch, setBranchData]);

  const updateRequestItem = useCallback((id: string, updates: Partial<CustomerRequest>) => {
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    setBranchData(prev => ({
        ...prev,
        [key]: prev[key].map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  }, [currentBranch, setBranchData]);

  return {
    resetRequestForm,
    handleSaveRequest,
    handleDeleteRequest,
    handleRestoreRequest,
    updateRequestItem
  };
}
