import {
  crc32,
  generateCubeNameWithCollisionHandling,
  hashOriginToName,
  toBase36Lower,
} from './cube-naming';

describe('cube-naming', () => {
  it('computes CRC32 for known inputs', () => {
    expect(crc32('')).toBe(0);
    expect(crc32('0,0,0')).toBe(3060064655);
    expect(crc32('10,10,10')).toBe(1240534424);
  });

  it('encodes unsigned integers as lowercase base36', () => {
    expect(toBase36Lower(1240534424)).toBe('kikyhk');
    expect(toBase36Lower(3060064655)).toBe('1elvszz');
  });

  it('hashes origin keys deterministically', () => {
    expect(hashOriginToName('10,10,10')).toBe('kikyhk');
    expect(hashOriginToName('0,0,0')).toBe('1elvszz');
    expect(hashOriginToName('10,-10,0')).toBe('1gqdbp2');
  });

  it('rehashes with salt when the base name is taken', () => {
    const taken = new Set<string>(['kikyhk']);
    const name = generateCubeNameWithCollisionHandling('10,10,10', (candidate) =>
      taken.has(candidate),
    );
    expect(name).not.toBe('kikyhk');
    expect(name).toBe(hashOriginToName('10,10,10', ':1'));
  });
});
