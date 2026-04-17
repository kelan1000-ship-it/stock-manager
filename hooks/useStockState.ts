import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BranchData, BranchKey, Product, CustomerRequest } from '../types';
import { StockState, setBranchData as setReduxBranchData, setCurrentBranch as setCurrentBranchAction } from '../components/stockSlice';
import { useAuth } from '../contexts/AuthContext';

export const initialFormData: Partial<Product> = {
  name: '',
  subheader: '',
  barcode: '',
  productCode: '',
  packSize: '',
  price: 0,
  costPrice: 0,
  stockToKeep: 0,
  looseStockToKeep: 0,
  stockInHand: 0,
  partPacks: 0,
  location: '',
  supplier: '',
  productImage: '',
  sourceUrls: [],
  notes: '',
  expiryDate: '',
  keywords: '',
  tags: [],
  stockType: 'retail',
  isDiscontinued: false,
  isUnavailable: false,
  isReducedToClear: false,
  isShared: false,
  isPriceSynced: false,
  enableThresholdAlert: false,
  isExcessStock: false,
  noVat: false,
  reducedVat: false,
  skipStockCheck: false,
};

export const initialRequestFormData: Partial<CustomerRequest> = {
  customerName: '',
  productName: '',
  contactDetails: '',
  notes: '',
  status: 'pending'
};

export function useStockState() {
  const dispatch = useDispatch();
  const { currentBranch, setCurrentBranch } = useAuth();

  // Keep Redux's currentBranch in lockstep with auth so the firestoreMiddleware's
  // branch-aware filters (unread counts, pending transfers) target the right user.
  useEffect(() => {
    dispatch(setCurrentBranchAction(currentBranch));
  }, [currentBranch, dispatch]);
  
  // Local UI states (keeping these local as they don't need to be global/synced)
  const [mainView, setMainView] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [subFilter, setSubFilter] = useState('all');
  const [stockTypeFilter, setStockTypeFilter] = useState('all');
  const [isManageDataOpen, setIsManageDataOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isMasterCatalogueOpen, setIsMasterCatalogueOpen] = useState(false);
  const [isTransferInboxOpen, setIsTransferInboxOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }[]>([]);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isMissingAttributesOpen, setIsMissingAttributesOpen] = useState(false);
  const [orderTab, setOrderTab] = useState<'active' | 'backorder'>('active');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>(initialFormData);
  const [copyToBothBranches, setCopyToBothBranches] = useState(false);

  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestFormData, setRequestFormData] = useState<Partial<CustomerRequest>>(initialRequestFormData);

  const [bulkItems, setBulkItems] = useState<Partial<Product>[]>([]);
  const [bulkScanningRowId, setBulkScanningRowId] = useState<number | null>(null);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusFilterMode, setStatusFilterMode] = useState<'show' | 'hide'>('show');

  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  // Select the entire stock state from Redux
  const stock = useSelector((state: { stock: StockState }) => state.stock);

  // Map the expanded Redux state back to the expected BranchData structure
  const branchData: BranchData = useMemo(() => ({
    bywood: stock.bywood,
    broom: stock.broom,
    messages: stock.messages,
    transfers: stock.transfers,
    bywoodRequests: stock.bywoodRequests,
    broomRequests: stock.broomRequests,
    bywoodRequests_archived: stock.bywoodRequests_archived,
    broomRequests_archived: stock.broomRequests_archived,
    bywoodOrders: stock.bywoodOrders,
    broomOrders: stock.broomOrders,
    jointOrders: stock.jointOrders,
    masterInventory: stock.masterInventory,
    bywoodPlanograms: stock.bywoodPlanograms,
    broomPlanograms: stock.broomPlanograms,
    bywoodFloorPlans: stock.bywoodFloorPlans,
    broomFloorPlans: stock.broomFloorPlans,
    suppliers: stock.suppliers,
    tasks: stock.tasks,
    screenshotHistory: stock.screenshotHistory,
    sharedOrderDrafts: stock.sharedOrderDrafts
  }), [stock]);

  // Wrapper for setBranchData to update Redux
  const setBranchData = useCallback((update: React.SetStateAction<BranchData>) => {
    if (typeof update === 'function') {
      const nextData = update(branchData);
      dispatch(setReduxBranchData(nextData));
    } else {
      dispatch(setReduxBranchData(update));
    }
  }, [branchData, dispatch]);

  return {
    currentBranch, setCurrentBranch,
    branchData, setBranchData,
    mainView, setMainView,
    searchQuery, setSearchQuery,
    subFilter, setSubFilter,
    stockTypeFilter, setStockTypeFilter,
    isManageDataOpen, setIsManageDataOpen,
    isBulkOpen, setIsBulkOpen,
    isMasterCatalogueOpen, setIsMasterCatalogueOpen,
    isTransferInboxOpen, setIsTransferInboxOpen,
    isChatOpen, setIsChatOpen,
    isMuted, setIsMuted,
    sortConfig, setSortConfig,
    isVisionScanning, setIsVisionScanning,
    isAILoading, setIsAILoading,
    isMissingAttributesOpen, setIsMissingAttributesOpen,
    orderTab, setOrderTab,
    
    // Forms
    isAdding, setIsAdding,
    editingId, setEditingId,
    formData, setFormData,
    copyToBothBranches, setCopyToBothBranches,

    // Requests
    isAddingRequest, setIsAddingRequest,
    editingRequestId, setEditingRequestId,
    requestFormData, setRequestFormData,

    // Bulk
    bulkItems, setBulkItems,
    bulkScanningRowId, setBulkScanningRowId,

    // Status Filters
    selectedStatuses, setSelectedStatuses,
    statusFilterMode, setStatusFilterMode,

    // Duplicates
    isDuplicatesModalOpen, setIsDuplicatesModalOpen,

  syncStatus: stock.status === 'connected' ? 'connected' : 
                stock.status === 'loading' ? 'reconnecting' :
                stock.status === 'offline' ? 'offline' :
                stock.status === 'failed' ? 'error' : 'reconnecting',
  syncError: stock.error,
  lastNotification: stock.lastNotification
  };
}

export type StockStateReturn = ReturnType<typeof useStockState>;
