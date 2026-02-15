
// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { BranchData, BranchKey } from '../types';
import { prepareExportData, DEFAULT_HEADERS } from '../utils/inventoryParser';

export function useDataExchange(
  currentBranch: BranchKey,
  branchData: BranchData,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  const exportToExcel = useCallback((columns?: string[]) => {
    const activeColumns = columns && columns.length > 0 ? columns : DEFAULT_HEADERS;
    const rawData = branchData[currentBranch].filter(p => !p.deletedAt);
    
    const data = prepareExportData(rawData, activeColumns);
    const ws = XLSX.utils.json_to_sheet(data, { header: activeColumns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Greenchem_Inventory.xlsx");
  }, [branchData, currentBranch]);

  const exportToJson = useCallback(() => {
    const dataStr = JSON.stringify(branchData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenchem_backup_${new Date().toISOString()}.json`;
    a.click();
  }, [branchData]);

  const importData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            setBranchData(data);
        } catch (err) {
            console.error("Import failed", err);
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
  }, [setBranchData]);

  const clearAllData = useCallback(() => {
    if (confirm("Are you sure you want to wipe all data? This cannot be undone.")) {
        localStorage.removeItem('greenchem-data');
        window.location.reload();
    }
  }, []);

  const exportMasterToExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(branchData.masterInventory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Catalogue");
    XLSX.writeFile(wb, "Master_Catalogue.xlsx");
  }, [branchData.masterInventory]);

  return {
    exportToExcel,
    exportToJson,
    importData,
    clearAllData,
    exportMasterToExcel
  };
}
