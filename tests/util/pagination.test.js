import { describe, it, expect } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import paginate from '@/util/pagination';

const range = (n) => Array.from({ length: n }, (_, i) => i);
const data = range(10); // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

describe('paginate — no-op cases', () => {
  it('returns data unchanged when query is empty', () => {
    expect(paginate(data, {})).toEqual(data);
  });

  it('returns data unchanged when offset is absent', () => {
    expect(paginate(data, { limit: '3' })).toEqual(data);
  });

  it('returns data unchanged when offset is empty string', () => {
    expect(paginate(data, { offset: '' })).toEqual(data);
  });
});

describe('paginate — correct slicing', () => {
  it('slices from offset with limit', () => {
    expect(paginate(data, { offset: '2', limit: '3' })).toEqual([2, 3, 4]);
  });

  it('slices from offset 0', () => {
    expect(paginate(data, { offset: '0', limit: '4' })).toEqual([0, 1, 2, 3]);
  });

  it('returns empty array when offset exceeds length', () => {
    expect(paginate(data, { offset: '100', limit: '5' })).toEqual([]);
  });

  it('returns remaining items when limit exceeds remaining length', () => {
    expect(paginate(data, { offset: '8', limit: '5' })).toEqual([8, 9]);
  });
});

describe('paginate — validation errors', () => {
  it('throws 400 when offset given without limit', () => {
    expect(() => paginate(data, { offset: '2' })).toThrow(HTTPException);
    expect(() => paginate(data, { offset: '2' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('throws 400 for non-numeric limit', () => {
    expect(() => paginate(data, { offset: '0', limit: 'abc' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('throws 400 for non-numeric offset', () => {
    expect(() => paginate(data, { offset: 'abc', limit: '5' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('throws 400 for zero limit', () => {
    expect(() => paginate(data, { offset: '0', limit: '0' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('throws 400 for negative limit', () => {
    expect(() => paginate(data, { offset: '0', limit: '-1' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('throws 400 for negative offset', () => {
    expect(() => paginate(data, { offset: '-1', limit: '5' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });
});
