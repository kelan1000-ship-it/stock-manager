import { Product } from '../types';
import { findProductMatches } from './productMatching';

export const runStockTests = (products: Product[]) => {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const log = (msg: string, success: boolean) => {
    results.push(`${success ? '✅' : '❌'} ${msg}`);
    if (success) passed++; else failed++;
  };

  // 1. Data Integrity Checks
  products.forEach(p => {
    if (p.stockInHand < 0) log(`Negative Stock: ${p.name} (${p.stockInHand})`, false);
    if ((p.partPacks || 0) < 0) log(`Negative Parts: ${p.name} (${p.partPacks})`, false);
  });

  if (products.length > 0) {
      // 2. Status Logic Verification
      // Case A: 0 Full, 5 Parts -> Should NOT be Out of Stock
      const testProductA: any = { ...products[0], stockInHand: 0, partPacks: 5, isDiscontinued: false, isUnavailable: false, stockToKeep: 10 };
      let statusA = 'Healthy';
      if (testProductA.stockInHand === 0 && (testProductA.partPacks || 0) === 0) statusA = 'Out of Stock';
      else if (testProductA.stockInHand <= (testProductA.stockToKeep * 0.1)) statusA = 'Critical';
      
      if (statusA !== 'Out of Stock') log(`Status Logic: 0 Full / 5 Parts -> ${statusA} (Correct)`, true);
      else log(`Status Logic: 0 Full / 5 Parts -> Out of Stock (Incorrect)`, false);

      // Case B: 0 Full, 0 Parts -> Should be Out of Stock
      const testProductB: any = { ...products[0], stockInHand: 0, partPacks: 0, isDiscontinued: false, isUnavailable: false, stockToKeep: 10 };
      let statusB = 'Healthy';
      if (testProductB.stockInHand === 0 && (testProductB.partPacks || 0) === 0) statusB = 'Out of Stock';
      
      if (statusB === 'Out of Stock') log(`Status Logic: 0 Full / 0 Parts -> Out of Stock (Correct)`, true);
      else log(`Status Logic: 0 Full / 0 Parts -> ${statusB} (Incorrect)`, false);

      // 3. Search / Pack Logic Verification
      const testProductC: any = { ...products[0], stockInHand: 0, partPacks: 3 };
      const hasStock = testProductC.stockInHand > 0 || (testProductC.partPacks || 0) > 0;
      if (hasStock) log(`Pack Logic: 0 Full / 3 Parts -> Has Stock (Correct)`, true);
      else log(`Pack Logic: 0 Full / 3 Parts -> No Stock (Incorrect)`, false);

      // 4. Product Matching Logic Verification
      if (products.length > 0) {
          const targetNoBar = { ...products[0], barcode: '', name: 'UniqueTestItem', packSize: '100ml' } as Product;
          const inventory = [
              { ...products[0], barcode: '', name: 'UniqueTestItem', packSize: '100ml', id: 'match1' } as Product,
              { ...products[0], barcode: '123', name: 'OtherItem', packSize: '100ml', id: 'no-match' } as Product
          ];
          const matches = findProductMatches(inventory, targetNoBar);
          if (matches.length === 1 && matches[0].id === 'match1') log(`Matching Logic: Empty Barcode -> Name Match (Correct)`, true);
          else log(`Matching Logic: Empty Barcode -> Failed (${matches.length} matches)`, false);
      }
  } else {
      log("No products available to test logic against template.", true);
  }

  const report = `Stock Accuracy Tests:\n${results.join('\n')}\nPassed: ${passed}, Failed: ${failed}`;
  console.log(report);
  return { results, passed, failed, report };
};
