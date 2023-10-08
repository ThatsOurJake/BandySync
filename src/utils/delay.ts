import logger from "./logger";

const rng = (min: number, max: number) => Math.floor(Math.random() * max) + min;

const delay = (initialDelay: number) => new Promise(resolve => {
  const waitFor = initialDelay + (rng(1, 5) * 100);
  logger.info(`Waiting for ${waitFor} ms`);
  setTimeout(resolve, waitFor)
});

export default delay;
