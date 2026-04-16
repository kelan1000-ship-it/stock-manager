import React, { useEffect } from 'react';
import { 
  ProductFormPanel, RequestFormPanel, ChatWindow, TransferInbox, BulkAddView,
  DuplicateMatchModal, MasterInventoryCatalogue, ProductPreviewModal, LiveVisionScanner,
  MissingAttributesModal
} from './ManagerComponents';
import { StockTransferForm } from './StockTransferForm';
import { HistoryView } from './HistoryView';
import { ReconciliationView } from './ReconciliationView';
import { Product, BranchData, BranchKey } from '../types';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { TagStyle } from '../hooks/useInventoryTags';

interface ModalManagerProps {
  logic: StockLogicReturn;
  branchData: BranchData;
  currentBranch: BranchKey;
  theme: 'dark';
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  isTransferInboxOpen: boolean;
  setIsTransferInboxOpen: (v: boolean) => void;
  isTransferFormOpen: boolean;
  setIsTransferFormOpen: (v: boolean) => void;
  transferFormDefaultTab?: 'send' | 'request';
  selectedTransferProduct: Product | null;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
  selectedHistoryProduct: Product | null;
  previewImage: { src: string, title: string } | null;
  setPreviewImage: (v: { src: string, title: string } | null) => void;
  isReconciliationOpen: boolean;
  setIsReconciliationOpen: (v: boolean) => void;
  tagSettings: Record<string, TagStyle>;
  updateTagSettings: (tag: string, settings: Partial<TagStyle>) => void;
  allUniqueTags: string[];
  onScanDetected: (code: string) => void;
  messageTone: string;
  setMessageTone: (tone: any) => void;
  playNotification: (tone: any) => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  logic,
  branchData,
  currentBranch,
  theme,
  isChatOpen,
  setIsChatOpen,
  isTransferInboxOpen,
  setIsTransferInboxOpen,
  isTransferFormOpen,
  setIsTransferFormOpen,
  transferFormDefaultTab,
  selectedTransferProduct,
  isHistoryOpen,
  setIsHistoryOpen,
  selectedHistoryProduct,
  previewImage,
  setPreviewImage,
  isReconciliationOpen,
  setIsReconciliationOpen,
  tagSettings,
  updateTagSettings,
  allUniqueTags,
  onScanDetected,
  messageTone,
  setMessageTone,
  playNotification
}) => {
  // Clear manual unread overrides when the chat window is specifically opened
  useEffect(() => {
    if (isChatOpen) {
      localStorage.removeItem('manualUnreadMessages');
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      const ignored = JSON.parse(sessionStorage.getItem('ignoredUnread') || '[]');
      const unreadIds = (branchData.messages || [])
        .filter(m => m.sender !== currentBranch && !m.isRead && !ignored.includes(m.id))
        .map(m => m.id);

      if (unreadIds.length > 0) {
        logic.updateMessageReadStatus(unreadIds);
      }
    } else {
      sessionStorage.removeItem('ignoredUnread');
    }
  }, [isChatOpen, currentBranch, logic.updateMessageReadStatus, branchData.messages?.length]);

  return (
    <>
      <ProductFormPanel
        isOpen={logic.isAdding}
        onClose={logic.resetForm}
        formData={logic.formData}
        setFormData={logic.setFormData}
        onSave={logic.handleSaveProduct}
        onScan={() => { logic.setScanMode('default'); logic.setIsVisionScanning(true); }}
        onFullScan={logic.handleAIVisionResults}
        onFindMasterRecord={logic.findMasterRecord}
        onSuggestMaster={logic.suggestFromMaster}
        onUpdateMasterProduct={logic.updateMasterProduct}
        onAutoFill={logic.autoFillFromMaster}
        tagSettings={tagSettings}
        onUpdateTagSettings={updateTagSettings}
        theme={'dark'}
        isEditing={logic.isEditing}
        editingId={logic.editingId}
        copyToBoth={logic.copyToBoth}
        setCopyToBoth={logic.setCopyToBoth}
        isAILoading={logic.isAILoading}
        uniqueNames={logic.uniqueNames}
        uniqueSuppliers={logic.uniqueSuppliers}
        uniqueLocations={logic.uniqueLocations}
        uniquePackSizes={logic.uniquePackSizes}
        uniqueParentGroups={logic.uniqueParentGroups}
        allUniqueTags={allUniqueTags}
        currentBranch={currentBranch}
      />

      <RequestFormPanel 
        isOpen={logic.isAddingRequest} 
        onClose={logic.resetRequestForm} 
        formData={logic.requestFormData} 
        setFormData={logic.setRequestFormData} 
        onSave={logic.handleSaveRequest} 
        theme={theme} 
        isEditing={!!logic.editingRequestId} 
        uniqueNames={logic.uniqueProductNames}
        onSuggestProduct={logic.suggestFromMaster}
      />

      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        theme={theme}
        messageTone={messageTone}
        setMessageTone={setMessageTone}
        playNotification={playNotification}
        tasks={branchData.tasks}
        onAddTask={logic.addTask}
        onUpdateTask={logic.updateTask}
        onDeleteTask={logic.deleteTask}
      />
      <TransferInbox
        isOpen={isTransferInboxOpen}
        onClose={() => setIsTransferInboxOpen(false)}
        transfers={branchData.transfers}
        onProcess={logic.processTransfer}
        onClearHistory={logic.clearHistoricTransfers}
        currentBranch={currentBranch}
        theme={theme}
      />
      {logic.isBulkOpen && (
        <BulkAddView 
           items={logic.bulkItems} 
           onAddRow={logic.addBulkRow} 
           onUpdateRow={logic.updateBulkItem}
           onRemoveRow={logic.removeBulkItem}
           onProcessImages={logic.processBulkImages}
           onCommit={logic.commitBulkItems}
           onCommitReady={logic.commitReadyBulkItems}
           onToggleStatus={logic.toggleBulkItemStatus}
           onMarkAllReady={logic.markAllBulkItemsReady}
           theme={theme}
           isCameraOpen={logic.isBulkCameraOpen}
           setCameraOpen={logic.setIsBulkCameraOpen}
           currentBranch={currentBranch}
           onClose={() => logic.setIsBulkOpen(false)}
           onStartScanRow={(id: string) => { logic.setBulkScanningRowId(id); logic.setIsVisionScanning(true); }}
           isAILoading={logic.isAILoading}
           masterInventory={branchData.masterInventory}
           onSuggestMaster={logic.suggestFromMaster}
           uniqueLocations={logic.uniqueLocations}
        />
      )}

      {logic.isMasterCatalogueOpen && (
        <MasterInventoryCatalogue 
          isOpen={logic.isMasterCatalogueOpen} 
          onClose={() => logic.setIsMasterCatalogueOpen(false)} 
          masterInventory={branchData.masterInventory} 
          onAddProduct={logic.addMasterProduct}
          onBulkAddMaster={logic.addBulkMasterProducts}
          upsertBulkMasterProducts={logic.upsertBulkMasterProducts}
          updateMasterProduct={logic.updateMasterProduct}
          onDeleteProduct={logic.deleteMasterProduct}
          onDeleteBulk={logic.deleteBulkMasterProducts}
          onExport={logic.exportMasterToExcel}
          theme={theme}
        />
      )}

      <StockTransferForm 
        isOpen={isTransferFormOpen} 
        onClose={() => setIsTransferFormOpen(false)} 
        product={selectedTransferProduct} 
        currentBranch={currentBranch} 
        onCompleteInternal={logic.handleTransfer} 
        theme={theme}
        branchData={branchData} 
        defaultTab={transferFormDefaultTab}
      />

      <HistoryView
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        product={selectedHistoryProduct}
        theme={theme}
      />

      {logic.isVisionScanning && (
        <LiveVisionScanner 
          theme={theme} 
          onDetected={onScanDetected} 
          onClose={() => logic.setIsVisionScanning(false)} 
        />
      )}

      {logic.pendingDuplicate && (
        <DuplicateMatchModal 
           isOpen={!!logic.pendingDuplicate} 
           onClose={() => logic.setPendingDuplicate(null)} 
           product={logic.pendingDuplicate} 
           otherBranchName={logic.otherBranchName} 
           onAccept={logic.acceptDuplicateAndSync} 
           theme={theme} 
        />
      )}
      
      {previewImage && (
        <ProductPreviewModal
          src={previewImage.src}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={previewImage.title}
        />
      )}
      {isReconciliationOpen && (
        <ReconciliationView
          isOpen={isReconciliationOpen}
          onClose={() => setIsReconciliationOpen(false)}
          theme={theme}
        />
      )}

      {logic.isMissingAttributesOpen && (
        <MissingAttributesModal
          isOpen={logic.isMissingAttributesOpen}
          onClose={() => logic.setIsMissingAttributesOpen(false)}
          onUpdateProducts={logic.bulkUpdateProducts}
          theme={theme}
          currentBranch={currentBranch}
        />
      )}
    </>
  );
};
