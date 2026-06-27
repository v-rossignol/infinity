import { hexDistance } from './hex-grid';

describe('hexDistance', () => {
  it('returns 0 for the same hex', () => {
    expect(hexDistance({ q: 3, r: -2 }, { q: 3, r: -2 })).toBe(0);
  });

  it('returns 1 for directly adjacent hexes', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
  });

  it('returns 2 for hexes two steps away', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(2);
  });

  it('is symmetric', () => {
    const a = { q: 3, r: -1 };
    const b = { q: -2, r: 4 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });

  it('works with negative coordinates', () => {
    expect(hexDistance({ q: -3, r: 2 }, { q: -1, r: 0 })).toBe(2);
  });
});
