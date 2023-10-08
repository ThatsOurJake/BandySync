import crypto from 'crypto';
import logger from './utils/logger';
import { setConfig } from './utils/config';
import { SYNC_AT } from './constants';

export const bootstrap = () => {
  logger.info(`Generating password - make note of this as it'll only be shown once!`);
  const password = crypto.randomBytes(16).toString('hex');
  logger.info(`⭐️ Password: '${password}'`);
  logger.info(`Use this to sign into the UI - this is also used to encrypt your bandcamp cookie`);

  const hashed = crypto.createHash('sha256').update(password).digest('hex');

  setConfig({
    encryptionKey: hashed,
    syncAt: SYNC_AT,
  });
};

export default bootstrap;
