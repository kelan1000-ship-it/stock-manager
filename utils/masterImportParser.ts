import { MasterProduct } from '../types';

export interface ImportParseResult {
  processed: MasterProduct[];
  deletedIds: Set<string>;
  stats: {
    updated: number;
    new: number;
    deleted: number;
  };
  errors: string[];
}

// Map human-readable export headers back to internal field keys
function normalizeRow(row: any): any {
  const headerMap: Record<string, string> = {
    'product name': 'name',
    'subheader': 'subheader',
    'product group': 'parentGroup',
    'barcode': 'barcode',
    'pip': 'productCode',
    'pip code': 'productCode',
    'pack size': 'packSize',
    'price': 'price',
    'cost price': 'costPrice',
    'supplier': 'supplier',
    'image url': 'image',
    'is_deleted': 'is_deleted',
  };
  const normalized: any = {};
  for (const key of Object.keys(row)) {
    const mapped = headerMap[key.toLowerCase().trim()];
    normalized[mapped || key] = row[key];
  }
  return normalized;
}

export function parseMasterImportData(
  data: any[],
  masterInventory: MasterProduct[]
): ImportParseResult {
  const processed: MasterProduct[] = [];
  const deletedIds = new Set<string>();
  let updatedCount = 0;
  let newCount = 0;
  let deletedCount = 0;
  const errors: string[] = [];

  data.forEach((rawRow: any, index: number) => {
    const row = normalizeRow(rawRow);
    const name = String(row.name || '').trim();
    
    // 1. Data Validation: name is required
    if (!name) {
      errors.push(`Row ${index + 2}: Missing required field 'name'. Skipped.`);
      return;
    }
    
    const barcode = String(row.barcode || '').trim();
    const productCode = String(row.productCode || '').trim();
    const isDeletedFlag = row.is_deleted === true || String(row.is_deleted).toLowerCase() === 'true';
    
    // 2. Conflict Resolution
    let id = row.id ? String(row.id).trim() : '';
    const existing = masterInventory.find(p => 
      (barcode && p.barcode === barcode) || 
      (productCode && p.productCode === productCode)
    );

    if (!id) {
      if (existing) {
        id = existing.id;
      } else {
        id = `master_${Date.now()}_${index}`;
      }
    }

    // Handle Deletion
    if (isDeletedFlag) {
      if (existing || row.id) {
        deletedIds.add(id);
        deletedCount++;
      }
      return;
    }

    if (existing || row.id) {
      updatedCount++;
    } else {
      newCount++;
    }

    // 3. Data Mapping & Type Safety
    let price: number | undefined = undefined;
    if (row.price !== '' && row.price != null) {
       const parsedPrice = parseFloat(String(row.price).replace(/[^\d.-]/g, ''));
       if (!isNaN(parsedPrice)) price = parsedPrice;
    }

    let costPrice: number | undefined = undefined;
    if (row.costPrice !== '' && row.costPrice != null) {
       const parsedCost = parseFloat(String(row.costPrice).replace(/[^\d.-]/g, ''));
       if (!isNaN(parsedCost)) costPrice = parsedCost;
    }

    const newProduct: any = {
      id,
      name,
      subheader: String(row.subheader || '').trim(),
      parentGroup: String(row.parentGroup || '').trim(),
      packSize: String(row.packSize || '').trim(),
      productCode,
      barcode,
      image: String(row.image || '').trim(),
      supplier: String(row.supplier || '').trim()
    };

    if (price !== undefined) newProduct.price = price;
    if (costPrice !== undefined) newProduct.costPrice = costPrice;

    processed.push(newProduct as MasterProduct);
  });

  return {
    processed,
    deletedIds,
    stats: {
      updated: updatedCount,
      new: newCount,
      deleted: deletedCount
    },
    errors
  };
}
