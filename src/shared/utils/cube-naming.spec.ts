import { crc32, generateCubeNameWithCollisionHandling, hashOriginToName } from './cube-naming';

describe('cube-naming', () => {
  it('computes CRC32 for known inputs', () => {
    expect(crc32('')).toBe(0);
    expect(crc32('0,0,0')).toBe(3060064655);
    expect(crc32('10,10,10')).toBe(1240534424);
  });

  it('hashes origin keys into pronounceable three-syllable names', () => {
    expect(hashOriginToName('10,10,10')).toBe('Ces Luf Top');
    expect(hashOriginToName('0,0,0')).toBe('Dam Zil Pod');
    expect(hashOriginToName('10,-10,0')).toBe('Nod Nor Rez');
  });

  it('rehashes with salt when the base name is taken', () => {
    const taken = new Set<string>(['Ces Luf Top']);
    const name = generateCubeNameWithCollisionHandling('10,10,10', (candidate) =>
      taken.has(candidate),
    );
    expect(name).not.toBe('Ces Luf Top');
    expect(name).toBe(hashOriginToName('10,10,10', ':1'));
  });
});
