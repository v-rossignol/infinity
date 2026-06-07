import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8'),
) as { name: string; version: string };

export const appConfig = {
  name: packageJson.name,
  version: packageJson.version,
};
