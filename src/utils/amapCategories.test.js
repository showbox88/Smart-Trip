import { describe, it, expect } from 'vitest';
import { amapTypeForCategory } from './amapCategories';

describe('amapTypeForCategory', () => {
  it('maps known categories to AMap typecodes', () => {
    expect(amapTypeForCategory('dining')).toBe('050000');
    expect(amapTypeForCategory('cafe')).toBe('050500');
    expect(amapTypeForCategory('attractions')).toBe('110000');
    expect(amapTypeForCategory('shopping')).toBe('060000');
    expect(amapTypeForCategory('lodging')).toBe('100000');
  });
  it('returns empty string for all/unknown (no type filter)', () => {
    expect(amapTypeForCategory('all')).toBe('');
    expect(amapTypeForCategory('whatever')).toBe('');
  });
});
