import axios from "axios";
import cheerio from 'cheerio';

import { getConfig, setConfig } from "../utils/config";
import logger from "../utils/logger";
import delay from "../utils/delay";
import { downloadItems } from '../utils/downloader';

const BASE_URL = `https://bandcamp.com`;

interface UsernamePageData {
  identities: {
    fan: {
      id: number;
    };
  };
}

interface CollectionResp {
  redownload_urls: {
    [key: string]: string;
  };
  last_token: string;
  more_available: boolean;
}

type Dict = {[key: string]: string };

const fetchBandcampUserId = async (cookie: string): Promise<number> => {
  logger.info(`Fetching Bandcamp Username`);

  const { data } = await axios.get(`${BASE_URL}`, {
    headers: {
      cookie,
    }
  });
  const $ = cheerio.load(data);
  const pageData = $('#pagedata');
  const raw = pageData.attr('data-blob') || '';
  const { identities } = JSON.parse(raw) as UsernamePageData;

  if (!identities) {
    throw new Error('Cannot find username - no identities object');
  }

  const { fan: { id } } = identities;

  return id;
};

const getDownloadLinks = async (fanId: number, cookie: string, nextToken: string = ''): Promise<Dict> => {
  const olderThanToken = nextToken || `${new Date().valueOf()}:0:a::`;
  let output: Dict = {};

  logger.info(`Fetching download links`);

  const { data } = await axios.post<CollectionResp>(`${BASE_URL}/api/fancollection/1/collection_items`, {
    fan_id: fanId,
    older_than_token: olderThanToken,
    count: 20,
  }, {
    headers: {
      cookie
    }
  });

  if (data.redownload_urls) {
    output = {
      ...output,
      ...data.redownload_urls,
    };
  }

  if (data.more_available) {
    await delay(250);
    output = {
      ...output,
      ...(await getDownloadLinks(fanId, cookie, data.last_token))
    }
  }

  return output;
};

export const fetchBandcampData = async () => {
  const cfg = getConfig();
  
  if (!cfg) {
    return;
  }

  const { cookie, downloadedTracks = [] } = cfg;
  let { fanId } = cfg;

  if (!cookie) {
    return;
  }

  if (!fanId) {
    fanId = await fetchBandcampUserId(cookie);
    setConfig({
      fanId,
    });
  };

  logger.info(`Fetching Bandcamp Data`);

  const downloadLinks = await getDownloadLinks(fanId, cookie);

  const filtered = Object.keys(downloadLinks).reduce((acc: Dict, key: string) => {
    if (acc[key] || downloadedTracks.includes(key)) {
      return acc;
    }

    const value = downloadLinks[key];

    return {
      ...acc,
      [key]: value
    };
  }, {});

  const keyLength = Object.keys(filtered).length;

  if (keyLength === 0) {
    logger.info(`No items to sync!`);
    return;
  }

  logger.info(`Downloading ${keyLength} items`);
  await downloadItems(filtered);
  logger.info(`Sync Complete!`);
};
