import axios from 'axios';
import { writeFile } from 'fs/promises';

export const load = async (url, path) => {
  const content = await axios.get(url);
  const filePath = `${path}/site.html`;
  await writeFile(filePath, content.data);

  return filePath;
};
