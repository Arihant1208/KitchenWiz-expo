/**
 * Helper Tests - JSON
 */

import { cleanJson, safeParseJson, parseLlmJson } from '../../src/helpers/json';

describe('cleanJson', () => {
  it('should remove ```json prefix and ``` suffix', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it('should handle json without newlines', () => {
    const input = '```json{"key": "value"}```';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it('should handle already clean JSON', () => {
    const input = '{"key": "value"}';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it('should trim whitespace', () => {
    const input = '  {"key": "value"}  ';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it('should handle multiple code blocks', () => {
    const input = '```json\n{"a": 1}\n```\n```json\n{"b": 2}\n```';
    const result = cleanJson(input);
    expect(result).not.toContain('```');
  });
});

describe('safeParseJson', () => {
  it('should parse valid JSON', () => {
    const result = safeParseJson<{ key: string }>('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should return null for invalid JSON', () => {
    const result = safeParseJson('not json');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = safeParseJson('');
    expect(result).toBeNull();
  });

  it('should parse arrays', () => {
    const result = safeParseJson<number[]>('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should parse primitives', () => {
    expect(safeParseJson('42')).toBe(42);
    expect(safeParseJson('"hello"')).toBe('hello');
    expect(safeParseJson('true')).toBe(true);
    expect(safeParseJson('null')).toBeNull();
  });
});

describe('parseLlmJson', () => {
  it('should clean and parse JSON from LLM response', () => {
    const input = '```json\n{"recipe": "pasta"}\n```';
    const result = parseLlmJson<{ recipe: string }>(input);
    expect(result).toEqual({ recipe: 'pasta' });
  });

  it('should handle clean JSON', () => {
    const input = '{"recipe": "pasta"}';
    const result = parseLlmJson<{ recipe: string }>(input);
    expect(result).toEqual({ recipe: 'pasta' });
  });

  it('should return null for invalid JSON', () => {
    const input = '```json\nnot valid json\n```';
    const result = parseLlmJson(input);
    expect(result).toBeNull();
  });
});
