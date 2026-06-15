const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const CONSONANTS = [
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'v',
  'w',
  'z',
] as const;

const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const crc32 = (input: string): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i++) {
    crc = CRC32_TABLE[(crc ^ input.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

export const hashOriginToName = (originKey: string, salt = ''): string => {
  const hash = crc32(`${originKey}${salt}`);
  const b0 = (hash >>> 24) & 0xff;
  const b1 = (hash >>> 16) & 0xff;
  const b2 = (hash >>> 8) & 0xff;
  const b3 = hash & 0xff;

  const syllable1 =
    CONSONANTS[b0 % CONSONANTS.length] +
    VOWELS[b1 % VOWELS.length] +
    CONSONANTS[b2 % CONSONANTS.length];

  const syllable2 =
    CONSONANTS[b3 % CONSONANTS.length] +
    VOWELS[(b0 + b1) % VOWELS.length] +
    CONSONANTS[(b2 + b3) % CONSONANTS.length];

  const syllable3 =
    CONSONANTS[(b0 + b2) % CONSONANTS.length] +
    VOWELS[(b1 + b3) % VOWELS.length] +
    CONSONANTS[(b0 + b1 + b2 + b3) % CONSONANTS.length];

  return `${capitalize(syllable1)} ${capitalize(syllable2)} ${capitalize(syllable3)}`;
};

export const generateCubeNameWithCollisionHandling = (
  originKey: string,
  isNameTaken: (name: string) => boolean,
): string => {
  let salt = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = hashOriginToName(originKey, salt);
    if (!isNameTaken(name)) {
      return name;
    }
    salt = `:${attempt + 1}`;
  }
  throw new Error(`Unable to generate unique cube name for origin "${originKey}"`);
};
