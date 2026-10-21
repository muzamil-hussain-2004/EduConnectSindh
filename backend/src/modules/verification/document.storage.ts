import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env';

const uploadRoot = () => path.resolve(process.cwd(), env.UPLOAD_DIR);

export const documentStorage = {
  // The stored name is generated here (never taken from the user), which rules out path traversal.
  async save(buffer: Buffer, extension: string) {
    const storedName = `${randomUUID()}.${extension}`;
    await mkdir(uploadRoot(), { recursive: true });
    await writeFile(path.join(uploadRoot(), storedName), buffer, { flag: 'wx' });
    return storedName;
  },

  pathOf: (storedName: string) => path.join(uploadRoot(), storedName),

  async remove(storedName: string) {
    await unlink(path.join(uploadRoot(), storedName)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  },
};
