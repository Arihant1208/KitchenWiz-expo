/**
 * Helper Tests - Validation
 */

import { safePositiveInt } from '../../src/helpers/validation';

describe('safePositiveInt', () => {
  it('should return the number if positive integer', () => {
    expect(safePositiveInt(5, 1)).toBe(5);
    expect(safePositiveInt(100, 1)).toBe(100);
  });

  it('should round floating point numbers', () => {
    expect(safePositiveInt(5.7, 1)).toBe(6);
    expect(safePositiveInt(5.2, 1)).toBe(5);
  });

  it('should return fallback for zero', () => {
    expect(safePositiveInt(0, 10)).toBe(10);
  });

  it('should return fallback for negative numbers', () => {
    expect(safePositiveInt(-5, 10)).toBe(10);
    expect(safePositiveInt(-0.5, 10)).toBe(10);
  });

  it('should return fallback for NaN', () => {
    expect(safePositiveInt(NaN, 10)).toBe(10);
  });

  it('should return fallback for Infinity', () => {
    expect(safePositiveInt(Infinity, 10)).toBe(10);
    expect(safePositiveInt(-Infinity, 10)).toBe(10);
  });

  it('should handle string numbers', () => {
    expect(safePositiveInt('5', 1)).toBe(5);
    expect(safePositiveInt('10.8', 1)).toBe(11);
  });

  it('should return fallback for non-numeric strings', () => {
    expect(safePositiveInt('hello', 10)).toBe(10);
    expect(safePositiveInt('', 10)).toBe(10);
  });

  it('should return fallback for null/undefined', () => {
    expect(safePositiveInt(null, 10)).toBe(10);
    expect(safePositiveInt(undefined, 10)).toBe(10);
  });

  it('should return fallback for objects/arrays', () => {
    expect(safePositiveInt({}, 10)).toBe(10);
    expect(safePositiveInt([], 10)).toBe(10);
    expect(safePositiveInt([5], 10)).toBe(5); // Array coerces to number
  });
});
