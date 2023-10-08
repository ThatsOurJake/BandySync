import fs from 'fs';
import path from 'path';

import { getAppDir } from "./app-dir";

interface Config {
  encryptionKey: string;
  cookie?: string;
  syncAt: number;
  fanId?: number;
  downloadedTracks?: string[];
}

const FILE_NAME = 'config.json';

export const getConfig = (): Config | null => {
  const cfgPath = path.join(getAppDir(), FILE_NAME);

  if (!fs.existsSync(cfgPath)) {
    return null;
  }

  const raw = fs.readFileSync(cfgPath).toString();

  return JSON.parse(raw);
};

export const setConfig = (newConfig: Partial<Config>) => {
  const cfgPath = path.join(getAppDir(), FILE_NAME);

  const current = getConfig();
  const merged = {
    ...current,
    ...newConfig,
  };

  fs.writeFileSync(cfgPath, JSON.stringify(merged));
};
