import { runStockTests } from './stockAccuracyTests';
import { Product } from '../types';

describe('runStockTests', () => {
    it('should correctly identify positive results when data is clean', () => {
        const mockProducts = [
            {
                id: '1',
                name: 'Test Product 1',
                barcode: '1234567890123',
                stockInHand: 10,
                partPacks: 2,
                stockToKeep: 10,
                isDiscontinued: false,
                isUnavailable: false
            } as Product
        ];

        const { failed, passed, results } = runStockTests(mockProducts);
        
        expect(failed).toBe(0);
        expect(passed).toBeGreaterThan(0);
    });

    it('should correctly identify data integrity failures like negative stock', () => {
        const mockProducts = [
            {
                id: '2',
                name: 'Test Product 2',
                barcode: '9876543210987',
                stockInHand: -5,
                partPacks: -1,
                stockToKeep: 5
            } as Product
        ];

        const { failed, results } = runStockTests(mockProducts);

        expect(failed).toBe(2); // One for negative stock, one for negative parts
        expect(results.some(r => r.includes('Negative Stock'))).toBe(true);
        expect(results.some(r => r.includes('Negative Parts'))).toBe(true);
    });
});