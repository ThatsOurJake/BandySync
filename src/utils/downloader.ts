import path from 'path';
import fs from 'fs';
import util from 'util';
import stream from 'stream';

import axios from 'axios';
import cheerio from 'cheerio';
import Unzip from 'adm-zip';

import { getConfig, setConfig } from './config';
import delay from './delay';
import { getAppDir } from './app-dir';
import logger from './logger';

type Dict = {[key: string]: string };

const DOWNLOAD_FORMAT = 'mp3-320';
const FALLBACK_FORMAT = 'mp3-v0';

const pipeline = util.promisify(stream.pipeline);

interface ItemPageData {
  download_items: {
    downloads: {
      [format: string]: {
        url: string;
      };
    };
    type: 'album' | 'track';
    title: string;
    artist: string;
  }[]
}

export const getDownloadDir = () => {
  const downloadDir = path.join(getAppDir(), 'downloads');

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }

  return downloadDir;
};

const download = async (url: string, downloadLocation: string, cookie: string = '', { artist, title }: { title: string; artist: string }): Promise<void> => {
  logger.info(`Downloading: ${title} - ${artist}`);

  const request = await axios.get(url, {
    responseType: 'stream',
    headers: {
      cookie,
    }
  });

  await pipeline(request.data, fs.createWriteStream(downloadLocation));

  // TODO save to logs
  logger.info(`Downloaded: ${title} - ${artist} -> ${downloadLocation}`);
};

export const downloadItems = async (links: Dict) => {
  const cfg = getConfig()!;
  const keys = Object.keys(links);
  const newDownloadedTracks = [...(cfg.downloadedTracks || [])];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = links[key];

    try {
      const { data } = await axios.get(value, {
        headers: {
          cookie: cfg.cookie
        }
      });

      const $ = cheerio.load(data);
      const pageData = $('#pagedata');
      const raw = pageData.attr('data-blob') || '';
      const parsed = JSON.parse(raw) as ItemPageData;
      const [ item ] = parsed.download_items;

      if (!item) {
        throw new Error(`${value} - Download items is empty`);
      }

      const { artist, downloads, title, type } = item;

      const downloadLink = downloads[DOWNLOAD_FORMAT]?.url || downloads[FALLBACK_FORMAT]?.url;

      if (!downloadLink) {
        throw new Error(`${value} - No Mp3 found`);
      }

      const isAlbum = type === 'album';
      const fileExt = isAlbum ? '.zip' : '.mp3'; 
      const folderName = isAlbum ? '' : `${title} - ${artist}`;
      const downloadFolder = path.join(getDownloadDir(), folderName);

      if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder);
      }

      const sanitisedTitle = title.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_');
      const fileName = `${sanitisedTitle}${fileExt}`;
      const downloadLoc = path.join(downloadFolder, fileName);

      await download(downloadLink, downloadLoc, cfg.cookie, { artist, title });

      if (isAlbum) {
        logger.info(`Unzipping [${title} - ${artist}]`);
        const zip = new Unzip(downloadLoc);
        zip.extractAllTo(path.join(downloadFolder, sanitisedTitle));
        logger.info(`Unzipped [${title} - ${artist}]`);

        fs.rmSync(downloadLoc);
        logger.info(`Removed downloaded zip file`);
      }

      newDownloadedTracks.push(key);
    } catch (error) {
      logger.error(error, `${value} - Failed to download`);
    }

    if (i !== keys.length -1) {
      await delay(500);
    }
  }

  setConfig({
    downloadedTracks: newDownloadedTracks,
  });
};
