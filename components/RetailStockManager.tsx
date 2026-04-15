
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import { setStock } from './stockSlice';
import { 
  Plus, LayoutDashboard, Database, ChevronDown, MessageSquare,
  BarChart3, ClipboardList, Layers, Handshake, Sparkles,
  ArrowRightLeft, Volume2, VolumeX, LogOut, Users, Bell, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BranchSelector } from './BranchSelector';
import { AdminPanel } from './AdminPanel';
import { useStockLogic } from '../hooks/useStockLogic';
import { usePricingDesk } from '../hooks/usePricingDesk';
import { usePlanogram } from '../hooks/usePlanogram';
import { useSupplierFilter } from '../hooks/useSupplierFilter';
import { useLocationFilter } from '../hooks/useLocationFilter';
import { useSelection } from '../hooks/useSelection';
import { useInventoryTags } from '../hooks/useInventoryTags';
import { getProductStatus, STATUS_OPTIONS } from '../utils/statusUtils';
import { useProductNotes } from '../hooks/useProductNotes';
import { useInventorySync } from '../hooks/useInventorySync';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { useSlowMoverInsights } from '../hooks/useSlowMoverInsights';
import { ManageDataDropdown, BulkActionToolbar } from './ManagerComponents';
import { MainViewRouter } from './MainViewRouter';
import { ModalManager } from './ModalManager';
import { InventoryManagement } from './InventoryManagement';
import { LocalDuplicatesModal } from './LocalDuplicatesModal';
import { PriceCheckerModal } from './PriceCheckerModal';
import { HeaderGlobalSearch } from './HeaderGlobalSearch';
import { HeaderNotificationBar } from './HeaderNotificationBar';
import { GeminiAssistant } from './GeminiAssistant';
import { EposView } from './EposView';
import { TooltipWrapper } from './SharedUI';
import { useGeminiAssistant } from '../hooks/useGeminiAssistant';
import * as XLSX from 'xlsx';
import { parseInventoryFile, compareInventory, generateTemplate, InventoryComparisonResult, prepareExportData, FULL_EXPORT_HEADERS } from '../utils/inventoryParser';
import Logo from '../Logo';
import { verifyPriceSyncReset } from '../utils/verifyPriceSyncReset';
import { runStockTests } from '../utils/stockAccuracyTests';
import { matchesAnySearchField } from '../utils/stringUtils';
import { BranchKey, Product, CustomerRequest, OrderItem, InventorySubFilter } from '../types';

export const SOUND_CONFIG = {
  message_default: { type: 'sine', freqs: [880, 440], durations: [0.1, 0.05], volume: 0.4, name: 'Default Chime' },
  message_bell: { type: 'triangle', freqs: [1046.50, 1318.51], durations: [0.15, 0.4], volume: 0.3, name: 'Crystal Bell' },
  message_pop: { type: 'sine', freqs: [600, 800], durations: [0.05, 0.05], volume: 0.4, name: 'Soft Pop' },
  message_alert: { type: 'square', freqs: [440, 880], durations: [0.1, 0.1], volume: 0.2, name: 'Digital Alert' },
  message_echo: { type: 'sine', freqs: [880, 0, 880, 0, 880], durations: [0.1, 0.05, 0.1, 0.05, 0.2], volume: 0.3, name: 'Echo Triplet' },
  message_nudge: { type: 'sine', freqs: [440, 880, 440, 880], durations: [0.1, 0.1, 0.1, 0.2], volume: 0.5, name: 'Attention Nudge' },
  transfer_pending: { type: 'triangle', freqs: [523.25, 659.25], durations: [0.15, 0.2], volume: 0.3, name: 'Transfer Pending' },
  transfer_approved: { type: 'sine', freqs: [440, 554.37, 659.25, 880], durations: [0.1, 0.1, 0.1, 0.2], volume: 0.4, name: 'Transfer Approved' },
  transfer_fulfilled: { type: 'triangle', freqs: [523.25, 659.25, 783.99, 1046.50], durations: [0.1, 0.1, 0.1, 0.3], volume: 0.4, name: 'Transfer Fulfilled' },
  transfer_rejected: { type: 'sawtooth', freqs: [220, 110], durations: [0.15, 0.2], volume: 0.15, name: 'Transfer Rejected' }
} as const;

export type SoundType = keyof typeof SOUND_CONFIG;

function RetailStockManagerInner() {
  const { isAdmin, signOut, checkPermission } = useAuth();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [appMode, setAppMode] = useState<'stock-manager' | 'epos'>('stock-manager');
  const logic = useStockLogic();

  // Redux Sync Effect
  const dispatch = useDispatch();
  const currentInventory = logic.branchData[logic.currentBranch] || [];
  useEffect(() => {
    dispatch(setStock(currentInventory));
  }, [currentInventory, dispatch]);

  const pricingLogic = usePricingDesk(logic.branchData, logic.setBranchData, logic.currentBranch);
  const geminiAssistant = useGeminiAssistant(logic, pricingLogic, (product, qty, type) => {
    setSelectedTransferProduct(product);
    setIsTransferFormOpen(true);
  });
  const planogramLogic = usePlanogram(logic.branchData, logic.setBranchData, logic.currentBranch);
  const noteLogic = useProductNotes();
  const { syncImportedData } = useInventorySync(logic.branchData, logic.setBranchData, logic.currentBranch);
  const { columns, toggleColumn } = useColumnVisibility();
  
  const { 
    currentBranch, mainView, branchData, setBranchData, searchQuery, subFilter, stockTypeFilter, 
    isManageDataOpen, isBulkOpen, isMasterCatalogueOpen, 
    isTransferInboxOpen, setIsTransferInboxOpen, isChatOpen, setIsChatOpen,
    isMuted, setIsMuted, orderTab
  } = logic;
  
  const theme = 'dark';
  const [selectedTransferProduct, setSelectedTransferProduct] = useState<Product | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, title: string } | null>(null);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false);
  const [transferFormDefaultTab, setTransferFormDefaultTab] = useState<'send' | 'request'>('send');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const [manualRestockQtys, setManualRestockQtys] = useState<Record<string, number>>({});
  const [requestSortConfig, setRequestSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }[]>([]);
  const [requestTab, setRequestTab] = useState<'active' | 'archive' | 'bin'>('active');

  // Inventory Management Console States
  const [importResults, setImportResults] = useState<InventoryComparisonResult[]>([]);
  const [pendingImportData, setPendingImportData] = useState<Partial<Product>[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  
  // Local Duplicate Management
  const [isLocalDuplicatesOpen, setIsLocalDuplicatesOpen] = useState(false);

  // Price Checker State
  const [scanMode, setScanMode] = useState<'default' | 'priceCheck'>('default');
  const [priceCheckProduct, setPriceCheckProduct] = useState<Product | null>(null);
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false);

  // Settings Menu State
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    if (isSettingsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  const importFileRef = useRef<HTMLInputElement>(null);
  
  // System Restore Input Ref
  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Slow Movers Data Logic
  const rawBranchItems = branchData[currentBranch] || [];
  const { buckets } = useSlowMoverInsights(rawBranchItems);
  const slowMoverIds = useMemo(() => {
    const allSlow = [
      ...buckets.threeMonths, 
      ...buckets.sixMonths, 
      ...buckets.nineMonths, 
      ...buckets.deadStock
    ];
    return new Set(allSlow.map(x => x.product.id));
  }, [buckets]);

  const prevMsgCount = useRef(branchData.messages.length);
  const prevTrfCount = useRef(branchData.transfers.length);
  const prevTransfers = useRef([...branchData.transfers]);
  const prevBywoodReqs = useRef([...(branchData.bywoodRequests || [])]);
  const prevBroomReqs = useRef([...(branchData.broomRequests || [])]);

  const [messageTone, setMessageTone] = useState<SoundType>(() => {
    return (localStorage.getItem('messageTone') as SoundType) || 'message_default';
  });

  useEffect(() => {
    localStorage.setItem('messageTone', messageTone);
  }, [messageTone]);

  const notificationIconRef = useRef<string>("https://i.postimg.cc/9F0JcWHq/Greenchem-Logo-Official.png");

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    // Pre-generate a square padded logo for browser notifications so it isn't cropped
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scale = Math.min(192 / img.width, 192 / img.height) * 0.9;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (192 - w) / 2;
        const y = (192 - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        notificationIconRef.current = canvas.toDataURL('image/png');
      }
    };
    img.src = "https://i.postimg.cc/9F0JcWHq/Greenchem-Logo-Official.png";
  }, []);

  const audioContextRef = useRef<any>(null);

  const initAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.warn("Could not initialize audio context", e);
    }
  }, []);

  useEffect(() => {
    const handleGesture = () => initAudio();
    window.addEventListener('click', handleGesture);
    window.addEventListener('keydown', handleGesture);
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, [initAudio]);

  const playNotification = (type: keyof typeof SOUND_CONFIG) => {
    if (isMuted) return;
    
    try {
      const ctx = audioContextRef.current;
      if (!ctx || typeof ctx.createOscillator !== 'function') return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      
      const config = SOUND_CONFIG[type];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = config.type as any;

      let timeOffset = 0;
      config.freqs.forEach((freq, i) => {
        if (config.durations[i]) {
          osc.frequency.setValueAtTime(freq, now + timeOffset);
          timeOffset += config.durations[i];
        }
      });

      if (timeOffset <= 0) return;

      // Start with defined volume
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(config.volume, now + Math.min(0.01, timeOffset / 2));
      // Ramping slightly before the end to avoid clicks
      const fadeOutStart = Math.max(now + 0.01, now + timeOffset - 0.05);
      gain.gain.linearRampToValueAtTime(config.volume, fadeOutStart);
      gain.gain.linearRampToValueAtTime(0, now + timeOffset);
      
      osc.start(now);
      osc.stop(now + timeOffset);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    if (isMuted) {
       prevMsgCount.current = branchData.messages.length;
       prevTrfCount.current = branchData.transfers.length;
       prevTransfers.current = [...branchData.transfers];
       prevBywoodReqs.current = [...(branchData.bywoodRequests || [])];
       prevBroomReqs.current = [...(branchData.broomRequests || [])];
       return;
    }

        // 1. New Messages
        if (branchData.messages.length > prevMsgCount.current) {
            // Ensure we check the chronologically last message
            const sortedMessages = [...branchData.messages].sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const lastMsg = sortedMessages[sortedMessages.length - 1];
            if (lastMsg && lastMsg.sender !== currentBranch) {
                const isNudge = (lastMsg as any).isNudge;
                playNotification(messageTone);
                
                // Trigger native notification
                if ("Notification" in window && Notification.permission === "granted") {
                    const branchName = lastMsg.sender === 'bywood' ? 'Bywood Ave' : 'Broom Road';
                    const title = isNudge ? `🚨 URGENT Nudge from ${branchName}` : `New Message from ${branchName}`;
                    try {
                      const notification = new Notification(title, {
                          body: lastMsg.text,
                          icon: notificationIconRef.current,
                          silent: true // We play our own sound
                      });
                      notification.onclick = () => {
                          window.focus();
                          setIsChatOpen(true);
                      };
                    } catch (e) {
                      console.warn("Could not show native notification", e);
                    }
                }
            }
        }
        prevMsgCount.current = branchData.messages.length;
    // 2. Transfers Lifecycle Notifications
    branchData.transfers.forEach(current => {
        const previous = prevTransfers.current.find(t => t.id === current.id);

        if (!previous) {
            if (current.targetBranch === currentBranch && current.status === 'pending') {
                playNotification('transfer_pending');
            }
        } else if (previous.status !== current.status) {
            if (current.sourceBranch === currentBranch) {
                if (current.status === 'confirmed') playNotification('transfer_approved');
                if (current.status === 'completed') playNotification('transfer_fulfilled');
                if (current.status === 'cancelled') playNotification('transfer_rejected');
            } else if (current.targetBranch === currentBranch) {
                if (current.status === 'completed' && current.type === 'send') {
                    playNotification('transfer_fulfilled');
                }
            }
        }
    });
    prevTrfCount.current = branchData.transfers.length;
    prevTransfers.current = [...branchData.transfers];

    // 3. Customer Requests Lifecycle (Notifications Removed)
    prevBywoodReqs.current = [...(branchData.bywoodRequests || [])];
    prevBroomReqs.current = [...(branchData.broomRequests || [])];
  }, [branchData.messages, branchData.transfers, branchData.bywoodRequests, branchData.broomRequests, currentBranch, isMuted]);

  const tagMenuRef = useRef<HTMLDivElement>(null);
  const supplierMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  const updateManualQty = (id: string, qty: number) => {
    setManualRestockQtys(prev => ({ ...prev, [id]: qty }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tagMenuRef.current && !tagMenuRef.current.contains(target)) setIsTagMenuOpen(false);
      if (supplierMenuRef.current && !supplierMenuRef.current.contains(target)) setIsSupplierMenuOpen(false);
      if (locationMenuRef.current && !locationMenuRef.current.contains(target)) setIsLocationMenuOpen(false);
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) setIsStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dev mode: expose price sync reset verification on window
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__verifyPriceSyncReset = () => verifyPriceSyncReset(branchData, currentBranch);
    }
    return () => { if (import.meta.env.DEV) delete (window as any).__verifyPriceSyncReset; };
  }, [branchData, currentBranch]);

  const baseItems = useMemo(() => {
    const items = rawBranchItems;
    const now = new Date();
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const activeOrders = branchData[orderKey] || [];

    return items.filter(i => {
      if (mainView === 'inventory' || mainView === 'performance' || mainView === 'planogram' || mainView === 'shared-stock') { if (i.isArchived || i.deletedAt) return false; }
      else if (mainView === 'archive') { if (!i.isArchived || i.deletedAt) return false; }
      else if (mainView === 'bin') { if (!i.deletedAt) return false; }

      if (logic.selectedStatuses.length > 0) {
        const status = getProductStatus(i, mainView).text;
        let isMatched = logic.selectedStatuses.includes(status);

        if (subFilter === 'expiring' && i.expiryDate) {
          const exp = new Date(i.expiryDate).getTime();
          const diffDays = Math.ceil((exp - now.getTime()) / (1000 * 3600 * 24));
          let expStatus = '';
          if (diffDays <= 0) expStatus = 'Expired';
          else if (diffDays <= 30) expStatus = 'Critical Expiry';
          else if (diffDays <= 90) expStatus = 'Short Expiry';
          
          if (expStatus && logic.selectedStatuses.includes(expStatus)) {
            isMatched = true;
          }
        }

        if (logic.statusFilterMode === 'show') {
          if (!isMatched) return false;
        } else {
          if (isMatched) return false;
        }
      }

      if (mainView === 'inventory' || mainView === 'archive') {
        if (subFilter === 'restock') {
          const type = i.thresholdType || 'percentage';
          const val = i.thresholdValue !== undefined ? i.thresholdValue : 25;
          const isBelowThreshold = type === 'percentage' 
            ? i.stockInHand <= (i.stockToKeep * (val / 100))
            : i.stockInHand <= val;
          const hasSmartAlert = !!i.enableThresholdAlert;
          
          if (i.isDiscontinued) return false;
          
          const isPending = activeOrders.some(o => o.productId === i.id && o.status === 'pending');
          const isOnOrder = activeOrders.some(o => o.productId === i.id && (o.status === 'ordered' || o.status === 'backorder'));
          
          if (isOnOrder) return false;
          if (!(isPending || (hasSmartAlert && isBelowThreshold))) return false;
        } else if (subFilter === 'ordered') {
          const hasActiveOrder = activeOrders.some(o => o.productId === i.id && o.status === 'ordered');
          const hasBackorder = activeOrders.some(o => o.productId === i.id && o.status === 'backorder');
          
          if (orderTab === 'active' && !hasActiveOrder) return false;
          if (orderTab === 'backorder' && !hasBackorder) return false;
        } else if (subFilter === 'expiring') {
          if (!i.expiryDate) return false;
          const exp = new Date(i.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays > 90) return false;
        } else if (subFilter === 'clearance') {
          if (!i.isReducedToClear) return false;
        } else if (subFilter === 'alerts') {
          if (!pricingLogic.alerts.some(a => a.barcode === i.barcode)) return false;
        } else if (subFilter === 'labels') {
          if (!i.labelNeedsUpdate) return false;
        } else if (subFilter === 'slow-movers') {
          if (!slowMoverIds.has(i.id)) return false;
        } else if (subFilter === 'recently-added') {
          if (!i.createdAt) return false;
          const diffHours = (now.getTime() - new Date(i.createdAt).getTime()) / (1000 * 3600);
          if (diffHours > 48 || diffHours < 0) return false;
        } else if (subFilter === 'stock-check') {
          if (!i.needsStockCheck) return false;
        }
      }

      if (stockTypeFilter !== 'all' && (i.stockType || 'retail') !== stockTypeFilter) return false;
      return true;
    });
  }, [branchData, currentBranch, mainView, subFilter, logic.selectedStatuses, logic.statusFilterMode, stockTypeFilter, pricingLogic.alerts, slowMoverIds, orderTab]);

  const { uniqueSuppliers, selectedSuppliers, filterMode: supplierFilterMode, toggleSupplierFilter, clearSupplierFilters, toggleFilterMode: toggleSupplierFilterMode, filteredData: supplierFilteredItems } = useSupplierFilter(baseItems);
  const { uniqueLocations, selectedLocations, filterMode: locationFilterMode, toggleLocationFilter, clearLocationFilters, toggleFilterMode: toggleLocationFilterMode, filteredData: locationFilteredItems } = useLocationFilter(supplierFilteredItems);
  const { 
    activeFilters, 
    tagFilterMode,
    toggleFilter, 
    toggleTagFilterMode,
    clearFilters, 
    allUniqueTags, 
    filteredData: tagFilteredItems, 
    tagSettings, 
    updateTagSettings 
  } = useInventoryTags(locationFilteredItems, logic.updateProductItem);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tagFilteredItems.filter(i => {
      const matchSearch = !q || matchesAnySearchField([
        i.name, i.subheader, i.barcode, i.productCode, i.packSize, i.location, i.keywords
      ], q);
      return matchSearch;
    });
  }, [tagFilteredItems, searchQuery]);

  const effectiveSortConfig = useMemo(() => {
    if (subFilter === 'recently-added') {
      return [{ key: 'createdAt', direction: 'desc' as const }];
    }
    return logic.sortConfig;
  }, [subFilter, logic.sortConfig]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    if (effectiveSortConfig.length > 0) {
      sorted.sort((a: any, b: any) => {
        for (const { key, direction } of effectiveSortConfig) {
          let valA, valB;
          if (key === 'margin') {
            valA = a.price > 0 ? (a.price - a.costPrice) / a.price : 0;
            valB = b.price > 0 ? (b.price - b.costPrice) / b.price : 0;
          } else if (key === 'restockQty') {
            valA = Math.max(0, a.stockToKeep - a.stockInHand);
            valB = Math.max(0, b.stockToKeep - b.stockInHand);
          } else if (key === 'status') {
            const getStatusWeight = (i: Product) => {
              if (i.isDiscontinued) return 0;
              if (i.stockInHand < (i.stockToKeep * 0.35)) return 1;
              if (i.stockInHand < (i.stockToKeep * 0.50)) return 2;
              return 3;
            };
            valA = getStatusWeight(a);
            valB = getStatusWeight(b);
          } else if (key === 'createdAt' || key === 'dateAdded') {
            valA = new Date(a.createdAt || 0).getTime();
            valB = new Date(b.createdAt || 0).getTime();
          } else {
            valA = a[key as keyof Product];
            valB = b[key as keyof Product];
          }
          
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
          
          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  }, [filteredItems, effectiveSortConfig]);

  const liveOrderTotal = useMemo(() => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const activeOrders = branchData[orderKey] || [];

    return sortedItems.reduce((acc, item) => {
      let qty = 0;
      const existingOrder = activeOrders.find(o => o.productId === item.id && ['pending', 'ordered', 'backorder'].includes(o.status));
      
      if (existingOrder) {
        qty = existingOrder.quantity;
      } else if (subFilter === 'restock') {
        if (manualRestockQtys[item.id] !== undefined) {
            qty = manualRestockQtys[item.id];
        } else {
            qty = Math.max(0, item.stockToKeep - item.stockInHand);
        }
      }
      
      return acc + (item.costPrice * qty);
    }, 0);
  }, [sortedItems, branchData, currentBranch, subFilter, manualRestockQtys]);

  const { selectedIds, toggleSelection, toggleAll, clearSelection, isAllSelected, selectionCount } = useSelection(sortedItems);
  
  const sortedRequests = useMemo(() => {
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    const list = branchData[key] || [];
    const filtered = list.filter(r => {
      if (requestTab === 'active') return !r.deletedAt && !r.isArchived;
      if (requestTab === 'archive') return !r.deletedAt && r.isArchived;
      return !!r.deletedAt; // bin
    });
    if (requestSortConfig.length === 0) return filtered;
    return [...filtered].sort((a: any, b: any) => {
      for (const { key, direction } of requestSortConfig) {
        const valA = a[key];
        const valB = b[key];
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [branchData, currentBranch, requestTab, requestSortConfig]);

  const openProductEdit = (item: Product) => {
    logic.setFormData({ 
      ...logic.formData,
      ...item,
      subheader: item.subheader || '',
      price: item.price.toFixed(2),
      costPrice: item.costPrice.toFixed(2),
      stockToKeep: item.stockToKeep.toString(), 
      looseStockToKeep: item.looseStockToKeep?.toString() || '0',
      stockInHand: item.stockInHand.toString(), 
      partPacks: item.partPacks?.toString() || '',      looseUnitPrice: item.looseUnitPrice?.toString() || '',
      productCode: item.productCode || '',
      notes: item.notes || '',
      expiryDate: item.expiryDate || '',
      sourceUrls: item.sourceUrls || [],
      isDiscontinued: item.isDiscontinued || false,
      isUnavailable: item.isUnavailable || false,
      isReducedToClear: item.isReducedToClear || false,
      isShared: item.isShared || false,
      isPriceSynced: item.isPriceSynced || false,
      enableThresholdAlert: item.enableThresholdAlert || false,
      tags: item.tags || []
    }); 
    logic.setEditingId(item.id); 
    logic.setIsAdding(true); 
  };

  const openTransferForm = (item: Product, defaultTab: 'send' | 'request' = 'send') => {
    setSelectedTransferProduct(item);
    setTransferFormDefaultTab(defaultTab);
    setIsTransferFormOpen(true);
  };

  const openHistoryView = (item: Product) => {
    setSelectedHistoryProduct(item);
    setIsHistoryOpen(true);
  };

  const handleDetected = (code: string) => {
    if (scanMode === 'priceCheck') {
        const product = branchData[currentBranch].find(p => p.barcode === code && !p.deletedAt);
        setPriceCheckProduct(product || null);
        setIsPriceCheckerOpen(true);
        setScanMode('default');
    } else if (logic.bulkScanningRowId) {
       logic.updateBulkItem(logic.bulkScanningRowId, { barcode: code });
       logic.setBulkScanningRowId(null);
    } else if (logic.isAdding) {
       logic.setFormData({ ...logic.formData, barcode: code });
    } else {
       logic.setSearchQuery(code);
    }
    logic.setIsVisionScanning(false);
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const spreadsheetItems = await parseInventoryFile(file);
      const results = compareInventory(spreadsheetItems, branchData[currentBranch] || []);
      setPendingImportData(spreadsheetItems);
      setImportResults(results);
      setIsInventoryModalOpen(true);
    } catch (err) {
      console.error("Verification logic failed", err);
      alert("Format error: Ensure your spreadsheet matches the official Greenchem template.");
    }
    e.target.value = '';
  };

  const handleConfirmBulkSync = (ignoredIndices: Set<number>) => {
    const dataToSync = pendingImportData.filter((_, idx) => !ignoredIndices.has(idx));
    syncImportedData(dataToSync);
    setIsInventoryModalOpen(false);
    setPendingImportData([]);
    setImportResults([]);
  };

  const handleOpenInventoryManagement = () => {
    setImportResults([]); // Clear results so we show the landing dashboard
    setIsInventoryModalOpen(true);
  };

  const onOpenPriceChecker = () => {
    setScanMode('priceCheck');
    logic.setIsVisionScanning(true);
  };

  const globalProducts = useMemo(() => {
    const bywood = (branchData.bywood || []).filter(p => !p.deletedAt && !p.isArchived).map(p => ({ ...p, branch: 'bywood' }));
    const broom = (branchData.broom || []).filter(p => !p.deletedAt && !p.isArchived).map(p => ({ ...p, branch: 'broom' }));
    return [...bywood, ...broom];
  }, [branchData.bywood, branchData.broom]);

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 font-sans ${appMode === 'epos' ? 'bg-gray-100 text-gray-900' : 'bg-black text-slate-100'}`}>
      <header className="border-b sticky top-0 z-40 shadow-sm bg-slate-950 border-slate-800">
        <div className="w-full max-w-[99%] mx-auto px-2 sm:px-4 h-20 flex items-center justify-between gap-4">
          {/* Left: Branding & Branch Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Logo className="h-8 sm:h-14 w-auto" />
            <BranchSelector />
            <div className="hidden sm:flex p-1 rounded-2xl bg-slate-900 border border-slate-700">
              <button
                onClick={() => setAppMode('stock-manager')}
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  appMode === 'stock-manager' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Stock Manager
              </button>
              <button
                onClick={() => setAppMode('epos')}
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  appMode === 'epos' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                EPOS
              </button>
            </div>
          </div>

          {/* Center: New Global Search & Notifications */}
          <div className="flex-1 flex items-center justify-center gap-4 max-w-2xl px-4">
              <HeaderGlobalSearch 
                searchQuery={logic.searchQuery}
                onSearchChange={logic.setSearchQuery}
                onOpenPriceChecker={onOpenPriceChecker}
                products={globalProducts}
                currentBranch={currentBranch}
                onRequestTransfer={(product) => openTransferForm(product, 'request')}
                onProductSelect={(product) => openProductEdit(product)}
                onNavigate={(view) => {
                  if (view === 'master-inventory') {
                      logic.setIsMasterCatalogueOpen(true);
                  } else if (view === 'reconciliation') {
                      setIsReconciliationOpen(true);
                  } else {
                      logic.setMainView(view);
                      if (view === 'inventory') logic.setSubFilter('all');
                  }
                }}
              />

              <HeaderNotificationBar
                branchData={branchData}
                currentBranch={currentBranch}
                syncStatus={logic.syncStatus}
              />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <TooltipWrapper tooltip="Gemini AI Assistant">
              <button 
                onClick={() => geminiAssistant.setIsOpen(true)}
                className="p-1.5 sm:p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-white hover:bg-indigo-500/20 transition-all shadow-lg shadow-indigo-900/20 group"
              >
                <Sparkles size={18} className="group-hover:animate-pulse text-indigo-400" />
              </button>
            </TooltipWrapper>
            <TooltipWrapper tooltip="Transfer Logistics">
              <button 
                onClick={() => setIsTransferInboxOpen(true)} 
                className="relative p-1.5 sm:p-2.5 rounded-xl border transition-colors border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 shadow-lg shadow-amber-900/20"
              >
                <ArrowRightLeft size={18} />
                {branchData.transfers.filter(t => 
                  !t.resolvedAt && (
                    (t.targetBranch === currentBranch && t.status === 'pending') || 
                    (t.sourceBranch === currentBranch && t.status === 'confirmed' && t.type === 'request')
                  )
                ).length > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-900" />}
              </button>
            </TooltipWrapper>
            <TooltipWrapper tooltip="Branch Communications">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="relative p-1.5 sm:p-2.5 rounded-xl border transition-colors border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 shadow-lg shadow-indigo-900/20"
              >
                <MessageSquare size={18} />
                {branchData.messages.filter(m => m.sender !== currentBranch && !m.isRead).length > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900" />}
              </button>
            </TooltipWrapper>
            <div className="relative" ref={settingsDropdownRef}>
              <TooltipWrapper tooltip="Settings">
                <button
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                  className="p-1.5 sm:p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20"
                >
                  <Settings size={18} />
                </button>
              </TooltipWrapper>
              
              {isSettingsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border z-[100] p-2 animate-in fade-in zoom-in duration-200 bg-slate-900 border-slate-800 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      initAudio();
                      setIsSettingsMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                      isMuted ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300'
                    }`}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {isMuted ? 'Muted Notifications' : 'Audio Enabled'}
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsAdminPanelOpen(true);
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    >
                      <Users size={16} />
                      Manage Users
                    </button>
                  )}

                  <div className="h-px w-full bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      signOut();
                      setIsSettingsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {appMode === 'epos' ? (
        <EposView branchData={branchData} setBranchData={setBranchData} currentBranch={currentBranch} />
      ) : (
      <main className="w-full max-w-[99%] mx-auto p-2 sm:p-4 md:p-6 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
           <div className="flex p-1 rounded-2xl transition-colors bg-slate-950 overflow-x-auto max-w-full">
             <button onClick={() => { logic.setMainView('inventory'); logic.setSubFilter('all'); }} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'inventory' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><LayoutDashboard size={14} /> Inventory</button>
             <button onClick={() => logic.setMainView('shared-stock')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'shared-stock' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><Handshake size={14} /> Shared Stock</button>
             <button onClick={() => logic.setMainView('requests')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'requests' ? 'bg-rose-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><ClipboardList size={14} /> Requests</button>
             <button onClick={() => logic.setMainView('planogram')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'planogram' ? 'bg-violet-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><Layers size={14} /> Planogram</button>
             <button onClick={() => logic.setMainView('performance')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'performance' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><BarChart3 size={14} /> Performance</button>
           </div>
           
           {(mainView === 'inventory' || mainView === 'archive' || mainView === 'bin') && (
             <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-300">
               {mainView === 'inventory' && (checkPermission('inventory.create') || checkPermission('inventory.bulk')) && (
                 <div className="flex p-1 rounded-2xl bg-slate-950 border border-slate-800 mr-2 shadow-sm">
                    {checkPermission('inventory.bulk') && (
                        <>
                            <button 
                            onClick={() => logic.setIsBulkOpen(true)} 
                            className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white hover:bg-blue-600 group"
                            >
                            <Layers size={16} className="text-blue-500 group-hover:text-white transition-colors" /> 
                            <span>Bulk Add</span>
                            </button>
                            <div className="hidden sm:block w-px bg-slate-800 my-2" />
                        </>
                    )}
                    {checkPermission('inventory.create') && (
                        <button 
                        onClick={() => { logic.resetForm(); logic.setIsAdding(true); }} 
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white hover:bg-emerald-600 group"
                        >
                        <Plus size={16} className="text-emerald-500 group-hover:text-white transition-colors" /> 
                        <span>Add Item</span>
                        </button>
                    )}
                 </div>
               )}

               {checkPermission('inventory.bulk') && (
                 <div className="relative">
                    <button onClick={() => logic.setIsManageDataOpen(!isManageDataOpen)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 transition-all border ${isManageDataOpen ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-black text-white border-black hover:bg-slate-950'}`}><Database size={16} /> Inventory Management <ChevronDown size={14} className={`transition-transform duration-300 ${isManageDataOpen ? 'rotate-180' : ''}`} /></button>
                    <ManageDataDropdown 
                      isOpen={isManageDataOpen} 
                      onClose={() => logic.setIsManageDataOpen(false)} 
                      theme={theme} 
                      onExportExcel={logic.exportToExcel} 
                      onImportExcel={() => importFileRef.current?.click()} 
                      onDownloadTemplate={generateTemplate} 
                      onViewArchive={() => logic.setMainView('archive')} 
                      onViewBin={() => logic.setMainView('bin')} 
                      onSystemBackup={logic.exportToJson} 
                      onSystemRestore={() => restoreFileRef.current?.click()} 
                      onClearData={logic.clearAllData} 
                      onViewMaster={() => logic.setIsMasterCatalogueOpen(true)} 
                      onViewReconciliation={() => setIsReconciliationOpen(true)} 
                      onOpenManagement={handleOpenInventoryManagement}
                      onFindDuplicates={() => setIsLocalDuplicatesOpen(true)}
                      onViewMissingAttributes={() => logic.setIsMissingAttributesOpen(true)}
                      onRunDiagnostics={() => {
                        try {
                          const { report } = runStockTests(branchData[currentBranch] || []);
                          alert(report);
                        } catch (err) {
                          console.error("Diagnostics failed:", err);
                          alert("An error occurred while running diagnostics. Check the console for details.");
                        }
                      }}
                    />
                 </div>
               )}
             </div>
           )}
        </div>

                <MainViewRouter
                  mainView={mainView}
                  logic={logic}
                  branchData={branchData}
                  currentBranch={currentBranch}
                  setBranchData={setBranchData}
                  pricingLogic={pricingLogic}
                  planogramLogic={planogramLogic}
                  noteLogic={noteLogic}
                            sortedItems={sortedItems}
                            effectiveSortConfig={effectiveSortConfig}
                            sortedRequests={sortedRequests}
                            liveOrderTotal={liveOrderTotal}
          manualRestockQtys={manualRestockQtys}
          updateManualQty={updateManualQty}
          requestSortConfig={requestSortConfig}
          setRequestSortConfig={setRequestSortConfig}
          requestTab={requestTab}
          setRequestTab={setRequestTab}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          toggleAll={toggleAll}
          isAllSelected={isAllSelected}
          uniqueSuppliers={uniqueSuppliers}
          selectedSuppliers={selectedSuppliers}
          supplierFilterMode={supplierFilterMode}
          toggleSupplierFilter={toggleSupplierFilter}
          clearSupplierFilters={clearSupplierFilters}
          toggleSupplierFilterMode={toggleSupplierFilterMode}
          uniqueLocations={uniqueLocations}
          selectedLocations={selectedLocations}
          locationFilterMode={locationFilterMode}
          toggleLocationFilter={toggleLocationFilter}
          clearLocationFilters={clearLocationFilters}
          toggleLocationFilterMode={toggleLocationFilterMode}
          activeFilters={activeFilters}
          tagFilterMode={tagFilterMode}
          toggleFilter={toggleFilter}
          toggleTagFilterMode={toggleTagFilterMode}
          clearFilters={clearFilters}
          allUniqueTags={allUniqueTags}
          tagSettings={tagSettings}
          openProductEdit={openProductEdit}
          openTransferForm={openTransferForm}
          openHistoryView={openHistoryView}
          setPreviewImage={(img) => setPreviewImage(img)}
          theme={theme}
          isTagMenuOpen={isTagMenuOpen}
          setIsTagMenuOpen={setIsTagMenuOpen}
          isSupplierMenuOpen={isSupplierMenuOpen}
          setIsSupplierMenuOpen={setIsSupplierMenuOpen}
          isLocationMenuOpen={isLocationMenuOpen}
          setIsLocationMenuOpen={setIsLocationMenuOpen}
          isStatusMenuOpen={isStatusMenuOpen}
          setIsStatusMenuOpen={setIsStatusMenuOpen}
          tagMenuRef={tagMenuRef}
          supplierMenuRef={supplierMenuRef}
          locationMenuRef={locationMenuRef}
          statusMenuRef={statusMenuRef}
          onOpenPriceChecker={onOpenPriceChecker}          columns={columns}
          toggleColumn={toggleColumn}
          onOpenReconciliation={() => setIsReconciliationOpen(true)}
          onOpenDuplicates={() => setIsLocalDuplicatesOpen(true)}
        />
      </main>
      )}

      {appMode === 'stock-manager' && checkPermission('inventory.edit') && (
        <BulkActionToolbar
          count={selectionCount} 
          onClear={clearSelection}
          onAdjustPrice={(adjustment) => {
            logic.bulkAdjustPrices(new Set(selectedIds), adjustment);
            clearSelection();
          }}
          onAdjustCostPrice={(adjustment) => {
            logic.bulkAdjustCostPrices(new Set(selectedIds), adjustment);
            clearSelection();
          }}
          onReceive={() => { logic.bulkReceiveStock(selectedIds); clearSelection(); }}
          onUpdateIntelligence={(updates) => { logic.bulkUpdateSmartToggles(selectedIds, updates); clearSelection(); }}
          onArchive={() => { 
            if (mainView === 'bin') {
              logic.bulkRestoreProducts(selectedIds);
            } else {
              logic.bulkArchiveProducts(selectedIds);
            }
            clearSelection(); 
          }}
          onDelete={() => { logic.bulkDeleteProducts(selectedIds, mainView === 'bin'); clearSelection(); }}
          isArchiveView={mainView === 'archive'}
          isBinView={mainView === 'bin'}
          onExportExcel={() => {
            const selected = (branchData[currentBranch] || []).filter(p => selectedIds.has(p.id));
            if (selected.length === 0) return;
            const data = prepareExportData(selected, FULL_EXPORT_HEADERS);
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Export');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Greenchem_Export_${selected.length}_items_${date}.xlsx`);
            clearSelection();
          }}
        />
      )}

      <ModalManager
        logic={logic}
        branchData={branchData}
        setBranchData={setBranchData}
        currentBranch={currentBranch}
        theme={theme}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isTransferInboxOpen={isTransferInboxOpen}
        setIsTransferInboxOpen={setIsTransferInboxOpen}
        isTransferFormOpen={isTransferFormOpen}
        setIsTransferFormOpen={setIsTransferFormOpen}
        transferFormDefaultTab={transferFormDefaultTab}
        selectedTransferProduct={selectedTransferProduct}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        selectedHistoryProduct={selectedHistoryProduct}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        isReconciliationOpen={isReconciliationOpen}
        setIsReconciliationOpen={setIsReconciliationOpen}
        tagSettings={tagSettings}
        updateTagSettings={updateTagSettings}
        allUniqueTags={allUniqueTags}
        onScanDetected={handleDetected}
        messageTone={messageTone}
        setMessageTone={setMessageTone}
        playNotification={playNotification}
      />

      <InventoryManagement 
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        onConfirm={handleConfirmBulkSync}
        results={importResults}
        onExportExcel={logic.exportToExcel}
        onDownloadTemplate={generateTemplate}
        onTriggerImport={() => importFileRef.current?.click()}
      />

      <LocalDuplicatesModal
        isOpen={isLocalDuplicatesOpen}
        onClose={() => setIsLocalDuplicatesOpen(false)}
        inventory={branchData[currentBranch] || []}
        onDelete={(id) => logic.handleDeleteProduct(id, false)}
        theme={theme}
      />

      <PriceCheckerModal 
        isOpen={isPriceCheckerOpen}
        onClose={() => setIsPriceCheckerOpen(false)}
        product={priceCheckProduct}
      />

      <input 
        type="file" 
        ref={importFileRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleImportFileSelect}
      />
      
      <input 
        type="file" 
        ref={restoreFileRef}
        className="hidden"
        accept=".json"
        onChange={logic.importData}
      />

            <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
            
            <GeminiAssistant 
              isOpen={geminiAssistant.isOpen}
              onClose={() => geminiAssistant.setIsOpen(false)}
              messages={geminiAssistant.messages}
              onSend={geminiAssistant.handleSend}
              isLoading={geminiAssistant.isLoading}
              onClear={geminiAssistant.clearChat}
            />
            </div>
            );
            }

            export default function RetailStockManager() {
            return (
            <Provider store={store}>
            <RetailStockManagerInner />
            </Provider>
            );
            }