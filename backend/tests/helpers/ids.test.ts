/**
 * Helper Tests - IDs
 */

import { randomId } from '../../src/helpers/ids';

describe('randomId', () => {
  it('should generate a string', () => {
    const id = randomId();
    expect(typeof id).toBe('string');
  });

  it('should generate non-empty strings', () => {
    const id = randomId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(randomId());
    }
    // With 100 calls, we should have mostly unique IDs
    expect(ids.size).toBeGreaterThan(90);
  });

  it('should only contain alphanumeric characters', () => {
    const id = randomId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
