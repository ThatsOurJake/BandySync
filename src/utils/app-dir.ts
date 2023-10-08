import fs from 'fs';
import path from 'path';
import os from 'os';

const DIR_NAME = process.env.NODE_ENV == 'production' ? 'bandy-sync' : 'bandy-sync-dev';
const APP_DIR = path.join(os.homedir(), DIR_NAME);

export const getAppDir = (): string => {
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR);
  }

  return APP_DIR;
}
