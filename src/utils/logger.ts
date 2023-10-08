import pino from "pino";

export default pino({
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  formatters: {
    level: (label) => {
      return {
        level: label
      }
    }
  }
});
