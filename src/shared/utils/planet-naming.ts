const ROMAN_NUMERALS = [
  { value: 1000, symbol: 'M' },
  { value: 900, symbol: 'CM' },
  { value: 500, symbol: 'D' },
  { value: 400, symbol: 'CD' },
  { value: 100, symbol: 'C' },
  { value: 90, symbol: 'XC' },
  { value: 50, symbol: 'L' },
  { value: 40, symbol: 'XL' },
  { value: 10, symbol: 'X' },
  { value: 9, symbol: 'IX' },
  { value: 5, symbol: 'V' },
  { value: 4, symbol: 'IV' },
  { value: 1, symbol: 'I' },
] as const;

/** Converts a number to Roman numerals (1–3999). */
export const toRoman = (num: number): string => {
  if (!Number.isInteger(num) || num < 1 || num > 3999) {
    throw new RangeError(`Planet number must be an integer from 1 to 3999, got ${num}`);
  }

  let remaining = num;
  let result = '';

  for (const { value, symbol } of ROMAN_NUMERALS) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }

  return result;
};

/**
 * Builds a planet display name from its parent star name and 1-based planet index.
 * Example: ("Alpha Tiv Gic Pem", 4) → "Alpha TivGicPem IV"
 */
export const getPlanetName = (starName: string, planetNumber: number): string => {
  const [greekLetter, ...cubeNameParts] = starName.split(' ');
  const cubeNameNoSpaces = cubeNameParts.join('');
  const romanNumeral = toRoman(planetNumber);

  return `${greekLetter} ${cubeNameNoSpaces} ${romanNumeral}`;
};
