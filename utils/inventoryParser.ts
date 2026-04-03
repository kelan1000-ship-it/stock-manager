
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { toTitleCase } from './stringUtils';

/**
 * Maps Excel header names to internal Product property names.
 */
const HEADER_MAP: Record<string, keyof Product | string> = {
  'Name': 'name',
  'Product Name': 'name',
  'Subheader': 'subheader',
  'Barcode': 'barcode',
  'PIP': 'productCode',
  'Pack Size': 'packSize',
  'Price (£)': 'price',
  'Cost (£)': 'costPrice',
  'Stock In Hand': 'stockInHand',
  'Stock to Keep': 'stockToKeep',
  'Loose Stock Target': 'looseStockToKeep',
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
  'Product Group': 'parentGroup',
  'Keywords': 'keywords',
  'Target Price': 'targetPrice',
  'Unavailable': 'isUnavailable',
  'Excess Stock': 'isExcessStock',
  'Short Expiry': 'isShortExpiry',
  'Last Updated': 'lastUpdated',
  'Created At': 'createdAt',
  'Last Ordered Date': 'lastOrderedDate'
};

export const DEFAULT_HEADERS = [
  'Product Name', 'Subheader', 'Product Group', 'Barcode', 'PIP', 'Pack Size', 'Image URL', 'Stock Type',
  'Stock In Hand', 'Stock to Keep', 'Loose Stock Target', 'Loose Units', 'Supplier', 'Location', 'Expiry Date',
  'Price (£)', 'Cost (£)', 'Reduced to Clear',
  'Shared Stock', 'Price Synced', 'Threshold Alert', 'Discontinued', 'Notes', 'Tags', 'Keywords'
];

export const FULL_EXPORT_HEADERS = [
  ...DEFAULT_HEADERS,
  'Target Price', 'Unavailable', 'Excess Stock', 'Short Expiry',
  'Last Updated', 'Created At', 'Last Ordered Date'
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
        // Use 'array' type for better reliability with modern XLSX files
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with defval: null to ensure all columns are captured consistently
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];

        // Fuzzy aliases for common header variations (lowercase → internal field)
        const HEADER_ALIASES: Record<string, string> = {
          'pip code': 'productCode',
          'product code': 'productCode',
          'ean': 'barcode',
          'rrp': 'price',
          'cost': 'costPrice',
          'cost price': 'costPrice',
          'group': 'parentGroup',
          'sub header': 'subheader',
          'sub-header': 'subheader',
        };

        // Build a normalised lookup: actual Excel column header → internal field name
        const excelHeaders = json.length > 0 ? Object.keys(json[0]) : [];
        const columnMap: Record<string, string> = {};

        // Build a lowercase lookup from HEADER_MAP
        const headerMapLower: Record<string, string> = {};
        for (const [key, val] of Object.entries(HEADER_MAP)) {
          headerMapLower[key.toLowerCase().trim()] = val as string;
        }

        for (const excelHeader of excelHeaders) {
          const normalised = excelHeader.toLowerCase().trim();
          // Try exact match in HEADER_MAP (case-insensitive)
          if (headerMapLower[normalised]) {
            columnMap[excelHeader] = headerMapLower[normalised];
          } else if (HEADER_ALIASES[normalised]) {
            // Try fuzzy aliases
            columnMap[excelHeader] = HEADER_ALIASES[normalised];
          }
        }

        const products: Partial<Product>[] = json.map((row) => {
          const product: any = {};

          Object.entries(columnMap).forEach(([excelHeader, field]) => {
            let value = row[excelHeader];

            // If the cell is empty or null, don't include it in the update object
            if (value === undefined || value === null || String(value).trim() === '') return;

            // Numeric field sanitization
            if (['price', 'costPrice', 'stockInHand', 'stockToKeep', 'looseStockToKeep', 'partPacks'].includes(field)) {
              // Handle potential currency symbols or commas in strings
              if (typeof value === 'string') {
                value = value.replace(/[^\d.-]/g, '');
              }
              const numVal = parseFloat(value);
              if (!isNaN(numVal)) {
                product[field] = numVal;
              }
              return;
            }
            
            // Identification field sanitization - CRITICAL: Prevent scientific notation
            if (field === 'barcode' || field === 'productCode' || field === 'parentGroup') {
              // Convert to string and strip any whitespace or decimal points added by Excel
              let strVal = String(value).trim();
              
              // Handle scientific notation (e.g., 5.01E+12)
              if (strVal.includes('E+') || strVal.includes('e+')) {
                strVal = Number(value).toLocaleString('fullwide', { useGrouping: false });
              }
              
              // Strip trailing .0 if present
              if (strVal.endsWith('.0')) {
                strVal = strVal.substring(0, strVal.length - 2);
              }
              
              product[field] = strVal;
              return;
            }
            
            // Boolean field sanitization
            if (['isDiscontinued', 'isShared', 'isPriceSynced', 'enableThresholdAlert', 'isReducedToClear', 'isUnavailable', 'isExcessStock', 'isShortExpiry'].includes(field)) {
              const strVal = String(value).toLowerCase().trim();
              product[field] = strVal === 'yes' || strVal === 'true' || strVal === '1' || value === true;
              return;
            }

            // Array field sanitization (Tags)
            if (field === 'tags') {
                product[field] = String(value).split(',').map(t => t.trim()).filter(Boolean);
                return;
            }

            // Default: keep as is but trim if string
            let finalValue = typeof value === 'string' ? value.trim() : value;
            if (field === 'location' && typeof finalValue === 'string') {
              finalValue = toTitleCase(finalValue);
            }
            product[field] = finalValue;
          });
          return product;
        });

        resolve(products.filter(p => p.name || p.barcode)); // Must have at least a name or barcode
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
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

    // Matching logic: Barcode first, then fallback to Name (Strict string matching)
    const excelBarcode = excelItem.barcode ? String(excelItem.barcode).trim() : null;
    const excelName = excelItem.name ? String(excelItem.name).toLowerCase().trim() : null;

    const existing = currentInventory.find((p) => {
      if (excelBarcode && p.barcode) {
        return String(p.barcode).trim() === excelBarcode;
      }
      if (excelName && p.name) {
        return p.name.toLowerCase().trim() === excelName;
      }
      return false;
    });
    
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
      'name', 'subheader', 'parentGroup', 'barcode', 'productCode', 'packSize', 'price',
      'costPrice', 'stockInHand', 'stockToKeep', 'looseStockToKeep', 'partPacks', 'supplier',
      'location', 'isDiscontinued', 'isShared', 'isPriceSynced',
      'enableThresholdAlert', 'expiryDate', 'isReducedToClear', 'stockType',
      'notes', 'productImage', 'tags', 'keywords'
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
