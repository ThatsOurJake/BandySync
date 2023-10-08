import type { Context, Next } from "koa";
import session from "../storage/session";

const secure = async (ctx: Context, next: Next) => {
  const key = ctx.state.sessionCookie;

  if (!key) {
    ctx.redirect('/login');
    return;
  }

  const sesh = session.get(key);

  if (!sesh || !sesh.password) {
    ctx.redirect('/login');
    return;
  }

  await next();
};

export default secure;
