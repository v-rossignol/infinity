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

export const crc32 = (input: string): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i++) {
    crc = CRC32_TABLE[(crc ^ input.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

export const toBase36Lower = (value: number): string => (value >>> 0).toString(36);

export const hashOriginToName = (originKey: string, salt = ''): string =>
  toBase36Lower(crc32(`${originKey}${salt}`));

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
