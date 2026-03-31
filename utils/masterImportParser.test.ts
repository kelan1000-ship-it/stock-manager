import { parseMasterImportData } from './masterImportParser';
import { MasterProduct } from '../types';

describe('parseMasterImportData', () => {
    const mockMasterInventory: MasterProduct[] = [
        { id: 'master_1', name: 'Product 1', barcode: '111', packSize: '10' },
        { id: 'master_2', name: 'Product 2', barcode: '222', packSize: '20' }
    ];

    it('should correctly parse rows and identify updates', () => {
        const data = [
            { id: 'master_1', name: 'Product 1 Updated', barcode: '111', packSize: '10' },
            { name: 'Product 3 New', barcode: '333', packSize: '30' }
        ];

        const result = parseMasterImportData(data, mockMasterInventory);

        expect(result.stats.updated).toBe(1);
        expect(result.stats.new).toBe(1);
        expect(result.processed.length).toBe(2);
        expect(result.processed[0].name).toBe('Product 1 Updated');
        expect(result.processed[1].name).toBe('Product 3 New');
        expect(result.processed[1].id).toContain('master_');
    });

    it('should correctly handle the is_deleted flag', () => {
        const data = [
            { id: 'master_1', name: 'Product 1', barcode: '111', packSize: '10', is_deleted: true },
            { name: 'Product 2', barcode: '222', packSize: '20', is_deleted: 'true' }, // String version
            { name: 'Product 3', barcode: '333', packSize: '30', is_deleted: false }
        ];

        const result = parseMasterImportData(data, mockMasterInventory);

        expect(result.stats.deleted).toBe(2);
        expect(result.deletedIds.has('master_1')).toBe(true);
        expect(result.deletedIds.has('master_2')).toBe(true);
        expect(result.stats.new).toBe(1); // Product 3
        expect(result.processed.length).toBe(1);
        expect(result.processed[0].name).toBe('Product 3');
    });

    it('should skip rows missing a name', () => {
        const data = [
            { id: 'master_1', barcode: '111' }, // Missing name
            { id: 'master_2', name: 'Product 2', barcode: '222' }
        ];

        const result = parseMasterImportData(data, mockMasterInventory);

        expect(result.stats.updated).toBe(1);
        expect(result.errors.length).toBe(1);
        expect(result.processed.length).toBe(1);
    });

    it('should match existing products by barcode if ID is missing', () => {
        const data = [
            { name: 'Product 2', barcode: '222', packSize: '25' } // Missing ID but barcode matches master_2
        ];

        const result = parseMasterImportData(data, mockMasterInventory);

        expect(result.stats.updated).toBe(1);
        expect(result.processed[0].id).toBe('master_2');
        expect(result.processed[0].packSize).toBe('25');
    });
});
