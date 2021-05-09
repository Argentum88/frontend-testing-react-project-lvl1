import axios from 'axios';
import { writeFile } from 'fs/promises';
import { URL } from 'url';
import { join } from 'path';

const toFileName = (uri) => {
  const url = new URL(uri);
  const normalizedName = join(url.host, url.pathname).replace(/\W/g, '-');

  return `${normalizedName}.html`;
};

export default async (url, path) => {
  const content = await axios.get(url);
  const filePath = `${path}/${toFileName(url)}`;
  await writeFile(filePath, content.data);

  return filePath;
};
