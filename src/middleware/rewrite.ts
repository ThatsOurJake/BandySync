import { Context, Next } from "koa";

const rewrite = async (ctx: Context, next: Next) => {
  const originRedirect = ctx.redirect;

  ctx.redirect = (url: string, alt: string | undefined) => {
    let newUrl = url;

    if (process.env.BASE_PATH) {
      newUrl = `${process.env.BASE_PATH}${url}`;
    }

    const bound = originRedirect.bind(ctx);
    bound(newUrl, alt);
  };

  await next();
};

export default rewrite;
