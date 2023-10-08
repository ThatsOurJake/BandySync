import path from 'path';
import crypto from 'crypto';

import Koa, { Context } from 'koa';
import Pug from 'koa-pug';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import logger from './utils/logger';
import { getConfig, setConfig } from './utils/config';
import bootstrap from './bootstrap';
import secure from './middleware/secure';
import session from './storage/session';
import { COOKIE_AGE, SYNC_AT } from './constants';
import { fetchBandcampData } from './services/bandcamp';
import { getDownloadDir } from './utils/downloader';
import cron from './services/cron';

const app = new Koa();
const router = new Router();

app.use(bodyParser());

new Pug({
  app,
  viewPath: path.resolve(__dirname, 'views'),
});

app.use(async (ctx, next) => {
  let sessionCookie = ctx.cookies.get('x-session-id');

  if (!sessionCookie) {
    sessionCookie = crypto.randomUUID();
    session.set(sessionCookie, {});
  }

  ctx.cookies.set('x-session-id', sessionCookie, { maxAge: COOKIE_AGE * 60 * 1000, httpOnly: false });
  ctx.state.sessionCookie = sessionCookie;

  await next();
});

const generateCsrfToken = (ctx: Context) => {
  const csrfToken = crypto.randomUUID();

  session.set(ctx.state.sessionCookie, {
    csrfToken,
  });

  return csrfToken;
}

router.get('/login', async ctx => {
  const csrfToken = generateCsrfToken(ctx);

  await ctx.render('login', {
    csrfToken
  });
});

interface LoginDIO {
  password?: string;
  _token?: string;
  email?: string;
}

router.post('/login', async ctx => {
  const { _token, email, password } = ctx.request.body as LoginDIO;

  if (email || !_token || !password) {
    ctx.status = 400;
    return;
  }

  const sesh = session.get(ctx.state.sessionCookie);

  if (_token !== sesh?.csrfToken) {
    ctx.status = 403;
    return;
  }

  const config = getConfig();
  const hashed = crypto.createHash('sha256').update(password).digest('hex');

  if (config?.encryptionKey !== hashed) {
    const csrfToken = generateCsrfToken(ctx);

    await ctx.render('login', {
      csrfToken,
      incorrectPassword: true,
    });
    return;
  }

  session.set(ctx.state.sessionCookie, {
    password
  });

  ctx.redirect('/');
});

router.get('/', secure, async ctx => {
  const csrfToken = generateCsrfToken(ctx);
  const cfg = getConfig()!;

  await ctx.render('index', {
    csrfToken,
    bandcampCookie: cfg.cookie || 'NOT SET',
    syncAt: cfg.syncAt,
  });
});

interface UpdateDIO {
  cookie?: string;
  _token?: string;
  syncAt?: string;
}

router.post('/', secure, async ctx => {
  const { _token, syncAt: rawSyncAt, cookie } = ctx.request.body as UpdateDIO;
  
  if (!rawSyncAt || !_token || !cookie) {
    ctx.status = 400;
    return;
  }

  const syncAt = parseInt(rawSyncAt, 10);

  if (isNaN(syncAt)) {
    ctx.status = 400;
    return;
  }

  const csrfToken = generateCsrfToken(ctx);

  setConfig({
    cookie,
    syncAt,
  });

  cron.reinit(syncAt);

  await ctx.render('index', {
    csrfToken,
    bandcampCookie: cookie,
    syncAt: syncAt,
    updated: true,
  });
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  if (!getConfig()) {
    logger.info(`No config found - assuming first boot`);
    bootstrap();
  }

  const cfg = getConfig()!;
  cron.init(cfg.syncAt);

  logger.info(`All downloads will save to: ${getDownloadDir()}`);
  logger.info(`Listening on port: ${PORT}`);
});
