/**
 * Helper Tests - Dates
 */

import { getDateFromTimezone, getDateFromOffset, getLocalDayKey } from '../../src/helpers/dates';

describe('getDateFromTimezone', () => {
  it('should return date string for valid timezone', () => {
    const result = getDateFromTimezone('America/New_York');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return null for invalid timezone', () => {
    const result = getDateFromTimezone('Invalid/Timezone');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = getDateFromTimezone('');
    expect(result).toBeNull();
  });

  it('should return date in YYYY-MM-DD format', () => {
    const result = getDateFromTimezone('UTC');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDateFromOffset', () => {
  it('should return date string for offset 0 (UTC)', () => {
    const result = getDateFromOffset(0);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle positive offset (behind UTC)', () => {
    const result = getDateFromOffset(300); // 5 hours behind
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle negative offset (ahead of UTC)', () => {
    const result = getDateFromOffset(-330); // 5.5 hours ahead
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getLocalDayKey', () => {
  it('should use timezone header if present', () => {
    const mockReq = {
      header: (name: string) => {
        if (name === 'x-client-timezone') return 'America/Los_Angeles';
        return undefined;
      },
    };
    const result = getLocalDayKey(mockReq);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should fall back to offset header if timezone invalid', () => {
    const mockReq = {
      header: (name: string) => {
        if (name === 'x-client-timezone') return 'Invalid/TZ';
        if (name === 'x-client-tz-offset-minutes') return '0';
        return undefined;
      },
    };
    const result = getLocalDayKey(mockReq);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should fall back to UTC if no headers', () => {
    const mockReq = {
      header: () => undefined,
    };
    const result = getLocalDayKey(mockReq);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle empty headers', () => {
    const mockReq = {
      header: () => '',
    };
    const result = getLocalDayKey(mockReq);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
