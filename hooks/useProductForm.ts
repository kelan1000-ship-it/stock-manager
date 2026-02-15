
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Product, MasterProduct, ProductFormData } from '../types';

interface UseProductFormProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onUpdateMasterProduct?: (id: string, updates: Partial<MasterProduct>) => void;
  onFindMasterRecord: (criteria: { barcode?: string, productCode?: string, name?: string }) => MasterProduct | undefined;
  inventory?: Product[];
  editingId?: string | null;
}

export function useProductForm({ 
  formData, 
  setFormData, 
  onUpdateMasterProduct,
  onFindMasterRecord,
  inventory = [],
  editingId = null
}: UseProductFormProps) {
  const [newTagInput, setNewTagInput] = useState('');
  const [activeSettingsTag, setActiveSettingsTag] = useState<string | null>(null);
  const [masterQuery, setMasterQuery] = useState('');
  const [isMasterSearchActive, setIsMasterSearchActive] = useState(false);
  const isSelectingFromMaster = useRef(false);

  // Computed Values
  const profit = Math.max(0, (parseFloat(formData.price) || 0) - (parseFloat(formData.costPrice) || 0));
  const margin = (parseFloat(formData.price) || 0) > 0 ? (profit / parseFloat(formData.price)) * 100 : 0;
  
  const masterMatch = onFindMasterRecord({
    barcode: formData.barcode,
    productCode: formData.productCode,
    name: formData.name
  });
  
  const isAssetSynced = masterMatch && masterMatch.image === formData.productImage;

  // Effect: Real-time Group Price Conformance
  useEffect(() => {
    const groupName = formData.parentGroup?.trim();
    if (groupName && groupName !== '') {
       // Look for an item already in this group (that isn't the one being edited)
       const existingGroupMember = inventory.find(p => 
         p.parentGroup?.trim() === groupName && 
         p.id !== editingId && 
         !p.deletedAt
       );

       if (existingGroupMember) {
         const groupPriceStr = existingGroupMember.price.toFixed(2);
         // If form price doesn't match and we haven't just manually edited it (simple check)
         // we update it to match.
         if (formData.price !== groupPriceStr) {
           setFormData(prev => ({ ...prev, price: groupPriceStr }));
         }
       }
    }
  }, [formData.parentGroup, inventory, editingId, setFormData]); // Removed formData.price to prevent infinite loops

  // Handlers
  const handleAddTag = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTagInput('');
    }
  }, [newTagInput, formData.tags, setFormData]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tagToRemove)
    }));
  }, [setFormData]);

  const handleSelectMasterProduct = useCallback((p: MasterProduct) => {
    isSelectingFromMaster.current = true;
    setFormData((prev) => ({
      ...prev,
      name: p.name,
      barcode: p.barcode || prev.barcode,
      productCode: p.productCode || prev.productCode,
      packSize: p.packSize || prev.packSize,
      price: p.price ? p.price.toFixed(2) : prev.price,
      costPrice: p.costPrice ? p.costPrice.toFixed(2) : prev.costPrice,
      productImage: p.image || prev.productImage,
    }));
    setMasterQuery('');
    setIsMasterSearchActive(false);
    setTimeout(() => { isSelectingFromMaster.current = false; }, 500);
  }, [setFormData]);

  const handlePushAssetToMaster = useCallback(() => {
    if (masterMatch && formData.productImage && onUpdateMasterProduct) {
      onUpdateMasterProduct(masterMatch.id, { image: formData.productImage });
    }
  }, [masterMatch, formData.productImage, onUpdateMasterProduct]);

  const handlePullAssetFromMaster = useCallback(() => {
    if (masterMatch?.image) {
      setFormData((prev) => ({ ...prev, productImage: masterMatch.image! }));
    }
  }, [masterMatch, setFormData]);

  const handleSmartScan = useCallback((e: React.ChangeEvent<HTMLInputElement>, onFullScan: (b64: string, type: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onFullScan(base64, file.type);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  return {
    newTagInput,
    setNewTagInput,
    activeSettingsTag,
    setActiveSettingsTag,
    masterQuery,
    setMasterQuery,
    isMasterSearchActive,
    setIsMasterSearchActive,
    isSelectingFromMaster,
    profit,
    margin,
    masterMatch,
    isAssetSynced,
    handleAddTag,
    handleRemoveTag,
    handleSelectMasterProduct,
    handlePushAssetToMaster,
    handlePullAssetFromMaster,
    handleSmartScan
  };
}
