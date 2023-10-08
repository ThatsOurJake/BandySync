import cron from 'node-cron';
import { fetchBandcampData } from './bandcamp';
import logger from '../utils/logger';

const cronHandler = () => {
  let crn: cron.ScheduledTask;

  const init = (hourToRun: number) => {
    crn = cron.schedule(`* * ${hourToRun} * * *`, fetchBandcampData);
    logger.info(`Download will happen around ${hourToRun}:00`);
  };

  const reinit = (hourToRun: number) => {
    if (!crn) {
      return;
    }
    crn.stop();
    init(hourToRun);
  };

  return {
    init,
    reinit,
  }
};

export default cronHandler();
