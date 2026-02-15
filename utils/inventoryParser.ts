
import * as XLSX from 'xlsx';
import { Product } from '../types';

/**
 * Maps Excel header names to internal Product property names.
 */
const HEADER_MAP: Record<string, keyof Product | string> = {
  'Name': 'name',
  'Product Name': 'name',
  'Barcode': 'barcode',
  'PIP': 'productCode',
  'Pack Size': 'packSize',
  'Price (£)': 'price',
  'Cost (£)': 'costPrice',
  'Stock In Hand': 'stockInHand',
  'Stock to Keep': 'stockToKeep',
  'Loose Units': 'partPacks',
  'Supplier': 'supplier',
  'Location': 'location',
  'Expiry Date': 'expiryDate',
  'Notes': 'notes',
  'Product Image URL': 'productImage',
  'Image URL': 'productImage',
  'Stock Type': 'stockType',
  'Reduced to Clear': 'isReducedToClear',
  'Shared Stock': 'isShared',
  'Price Synced': 'isPriceSynced',
  'Threshold Alert': 'enableThresholdAlert',
  'Discontinued': 'isDiscontinued',
  'Tags': 'tags',
  'Parent SKU': 'parentGroup',
  'Parent Group': 'parentGroup',
  'SKU Group': 'parentGroup',
  'Product Group': 'parentGroup'
};

export const DEFAULT_HEADERS = [
  'Product Name', 'Product Group', 'Barcode', 'PIP', 'Pack Size', 'Image URL', 'Stock Type',
  'Stock In Hand', 'Stock to Keep', 'Loose Units', 'Supplier', 'Location', 'Expiry Date',
  'Price (£)', 'Cost (£)', 'Reduced to Clear',
  'Shared Stock', 'Price Synced', 'Threshold Alert', 'Discontinued', 'Notes', 'Tags'
];

export interface InventoryComparisonResult {
  barcode: string;
  name: string;
  differences: {
    field: string;
    excelValue: any;
    currentValue: any;
  }[];
  isNew: boolean;
}

/**
 * Parses an Excel file and returns an array of partial Product objects.
 * Sanitizes values to ensure type consistency and prevents empty cells from polluting the object.
 */
export const parseInventoryFile = async (file: File): Promise<Partial<Product>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const products: Partial<Product>[] = json.map((row) => {
          const product: any = {};
          Object.keys(HEADER_MAP).forEach((header) => {
            const field = HEADER_MAP[header];
            let value = row[header];

            // If the cell is empty or null, don't include it in the update object
            if (value === undefined || value === null || value === '') return;

            if (['price', 'costPrice', 'stockInHand', 'stockToKeep', 'partPacks'].includes(field as string)) {
              value = parseFloat(value) || 0;
            }
            
            // Critical fix: Ensure identification codes are treated as strings to avoid comparison bugs
            if (field === 'barcode' || field === 'productCode' || field === 'parentGroup') {
              value = String(value).trim();
            }
            
            if (['isDiscontinued', 'isShared', 'isPriceSynced', 'enableThresholdAlert', 'isReducedToClear'].includes(field as string)) {
              const strVal = String(value).toLowerCase().trim();
              value = strVal === 'yes' || strVal === 'true' || value === true;
            }

            if (field === 'tags') {
                value = String(value).split(',').map(t => t.trim()).filter(Boolean);
            }

            product[field] = value;
          });
          return product;
        });

        resolve(products);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Compares spreadsheet items with current inventory.
 * Uses Barcode as primary key, Name as secondary key.
 * Compares all visible fields.
 */
export const compareInventory = (
  spreadsheetItems: Partial<Product>[],
  currentInventory: Product[]
): InventoryComparisonResult[] => {
  const results: InventoryComparisonResult[] = [];

  spreadsheetItems.forEach((excelItem) => {
    // We need at least a name or barcode to verify
    if (!excelItem.barcode && !excelItem.name) return;

    // Matching logic: Barcode first, then fallback to Name
    const existing = currentInventory.find((p) => 
      (excelItem.barcode && String(p.barcode) === String(excelItem.barcode)) || 
      (!excelItem.barcode && excelItem.name && p.name.toLowerCase() === excelItem.name.toLowerCase())
    );
    
    if (!existing) {
      results.push({
        barcode: excelItem.barcode || 'N/A',
        name: excelItem.name || 'Unknown Item',
        differences: [],
        isNew: true
      });
      return;
    }

    const differences: InventoryComparisonResult['differences'] = [];
    const fieldsToCompare: (keyof Product)[] = [
      'name', 'parentGroup', 'barcode', 'productCode', 'packSize', 'price', 
      'costPrice', 'stockInHand', 'stockToKeep', 'partPacks', 'supplier', 
      'location', 'isDiscontinued', 'isShared', 'isPriceSynced', 
      'enableThresholdAlert', 'expiryDate', 'isReducedToClear', 'stockType', 
      'notes', 'productImage', 'tags'
    ];
    
    fieldsToCompare.forEach((field) => {
      const excelVal = excelItem[field];
      const currentVal = existing[field];

      // Only compare if the spreadsheet actually provides a value
      if (excelVal !== undefined && excelVal !== currentVal) {
        // Numeric tolerance (epsilon check)
        if (typeof excelVal === 'number' && typeof currentVal === 'number') {
          if (Math.abs(excelVal - currentVal) < 0.0001) return;
        }
        
        // String normalization for comparison
        if (typeof excelVal === 'string' && typeof currentVal === 'string') {
          if (excelVal.trim() === currentVal.trim()) return;
        }

        // Array comparison for tags
        if (Array.isArray(excelVal) && Array.isArray(currentVal)) {
            const sortedExcel = [...excelVal].sort().join(',');
            const sortedCurrent = [...currentVal].sort().join(',');
            if (sortedExcel === sortedCurrent) return;
        }

        differences.push({
          field: String(field).toUpperCase().replace(/([A-Z])/g, ' $1').trim(),
          excelValue: Array.isArray(excelVal) ? excelVal.join(', ') : excelVal,
          currentValue: currentVal === undefined || currentVal === null || currentVal === '' ? 'EMPTY' : (Array.isArray(currentVal) ? currentVal.join(', ') : currentVal)
        });
      }
    });

    if (differences.length > 0) {
      results.push({
        barcode: existing.barcode,
        name: existing.name,
        differences,
        isNew: false
      });
    }
  });

  return results;
};

/**
 * Prepares product data for Excel export by mapping to default headers.
 */
export const prepareExportData = (products: Product[], headers: string[] = DEFAULT_HEADERS): any[] => {
  return products.map(product => {
    const row: any = {};
    headers.forEach(header => {
      const key = HEADER_MAP[header];
      if (!key) return;

      const productKey = key as keyof Product;
      let value = product[productKey];

      if (typeof value === 'boolean') {
        value = value ? 'TRUE' : 'FALSE';
      }
      
      if (Array.isArray(value)) {
        value = value.join(', ');
      }

      if (value === undefined || value === null) {
        value = '';
      }

      row[header] = value;
    });
    return row;
  });
};

/**
 * Generates and downloads an Excel template with custom headers.
 */
export const generateTemplate = (headers: string[] = DEFAULT_HEADERS) => {
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
  XLSX.writeFile(wb, "Greenchem_Import_Template.xlsx");
};
