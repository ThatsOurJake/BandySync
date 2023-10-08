import { COOKIE_AGE } from "../constants";
import logger from "../utils/logger";

interface Session {
  lastFetched: number;
  password?: string;
  csrfToken?: string;
}

const sessionBuilder = (cleanupInterval: number = 5, sessionExpiry: number = COOKIE_AGE) => {
  const session: Map<string, Session> = new Map();

  const set = (key: string, newSession: Partial<Session>) => {
    const current = session.get(key);

    const merged = {
      ...current,
      ...newSession,
      lastFetched: new Date().valueOf(),
    };

    session.set(key, merged);
  };

  const get = (key: string): Session | undefined => {
    if (!session.has(key)) {
      return undefined;
    }

    set(key, {});

    return session.get(key);
  };

  const cleanup = () => {
    const expiry = new Date().valueOf() - (sessionExpiry * 60 * 1000)
    let cleanupCount = 0;

    session.forEach((v, k) => {
      if (v.lastFetched > expiry) {
        session.delete(k);
        cleanupCount += 1;
      }
    });

    logger.info(`${cleanupCount} sessions cleaned up`);
  };

  setTimeout(cleanup, cleanupInterval * 60 * 1000);

  logger.info(`Cleanup Job Started`);

  return {
    get,
    set,
  }
};

export default sessionBuilder();
