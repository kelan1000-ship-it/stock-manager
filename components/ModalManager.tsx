import React from 'react';
import { 
  ProductFormPanel, RequestFormPanel, ChatWindow, TransferInbox, BulkAddView,
  DuplicateMatchModal, MasterInventoryCatalogue, ProductPreviewModal, LiveVisionScanner
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
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  currentBranch: BranchKey;
  theme: 'dark';
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  isTransferInboxOpen: boolean;
  setIsTransferInboxOpen: (v: boolean) => void;
  isTransferFormOpen: boolean;
  setIsTransferFormOpen: (v: boolean) => void;
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
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  logic,
  branchData,
  setBranchData,
  currentBranch,
  theme,
  isChatOpen,
  setIsChatOpen,
  isTransferInboxOpen,
  setIsTransferInboxOpen,
  isTransferFormOpen,
  setIsTransferFormOpen,
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
  onScanDetected
}) => {
  return (
    <>
      <ProductFormPanel 
        isOpen={logic.isAdding} 
        onClose={logic.resetForm} 
        formData={logic.formData} 
        setFormData={logic.setFormData} 
        onSave={logic.handleSaveProduct} 
        onScan={() => logic.setIsVisionScanning(true)} 
        onFullScan={logic.handleFullAIScan}
        onFindMasterRecord={logic.findMasterRecord}
        onSuggestMaster={logic.suggestFromMaster}
        onUpdateMasterProduct={logic.updateMasterProduct}
        onAutoFill={logic.handleAIProductLookup}
        tagSettings={tagSettings}
        onUpdateTagSettings={updateTagSettings}
        theme={theme} 
        isEditing={!!logic.editingId}
        editingId={logic.editingId}
        inventory={branchData[currentBranch] || []}
        copyToBoth={logic.copyToBothBranches}
        setCopyToBoth={logic.setCopyToBothBranches}
        isAILoading={logic.isAILoading}
        uniqueNames={logic.uniqueProductNames}
        uniqueSuppliers={logic.uniqueSuppliers}
        uniqueLocations={logic.uniqueLocations}
        uniquePackSizes={logic.uniquePackSizes}
        uniqueParentGroups={logic.uniqueParentGroups}
        allUniqueTags={allUniqueTags}
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
        messages={branchData.messages} 
        onSend={logic.sendMessage} 
        onToggleReadStatus={logic.toggleMessageReadStatus}
        currentBranch={currentBranch} 
        theme={theme} 
      />

      <TransferInbox 
        isOpen={isTransferInboxOpen} 
        onClose={() => setIsTransferInboxOpen(false)} 
        transfers={branchData.transfers} 
        onProcess={logic.processTransfer} 
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
      />

      <HistoryView 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        product={selectedHistoryProduct} 
        branchData={branchData}
        currentBranch={currentBranch}
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
          branchData={branchData} 
          setBranchData={setBranchData} 
          currentBranch={currentBranch} 
          theme={theme} 
        />
      )}
    </>
  );
};
