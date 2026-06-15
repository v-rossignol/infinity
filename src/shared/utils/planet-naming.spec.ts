import { getPlanetName, toRoman } from './planet-naming';

describe('planet-naming', () => {
  describe('toRoman', () => {
    it('converts common planet ordinals', () => {
      expect(toRoman(1)).toBe('I');
      expect(toRoman(4)).toBe('IV');
      expect(toRoman(7)).toBe('VII');
      expect(toRoman(9)).toBe('IX');
    });

    it('rejects out-of-range values', () => {
      expect(() => toRoman(0)).toThrow(RangeError);
      expect(() => toRoman(4000)).toThrow(RangeError);
    });
  });

  describe('getPlanetName', () => {
    it('combines greek letter, compact cube name, and roman numeral', () => {
      expect(getPlanetName('Alpha Tiv Gic Pem', 1)).toBe('Alpha TivGicPem I');
      expect(getPlanetName('Alpha Tiv Gic Pem', 4)).toBe('Alpha TivGicPem IV');
      expect(getPlanetName('Beta Ces Luf Top', 3)).toBe('Beta CesLufTop III');
    });
  });
});
