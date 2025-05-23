import gracefulfs from 'graceful-fs';
import { promisify } from 'util';
import path from 'path';
import { Readable } from 'stream';

/* Direct import from installed https://github.com/storacha/files-from-path throws an error */

export type FileLike = Pick<File, 'stream' | 'name' | 'size'>;

export type Dirent = {
  name: string;
  isFile: () => boolean;
  isDirectory: () => boolean;
};

export type DirReader = {
  readdir: (
    path: string,
    options: {
      withFileTypes: true;
    },
  ) => Promise<Dirent[]>;
};

export type Stats = {
  size: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
};

export type StatGetter = {
  stat: (path: string) => Promise<Stats>;
};

export type FileSystem = {
  createReadStream: (path: string) => import('node:fs').ReadStream;
  promises: DirReader & StatGetter;
};

const defaultfs = {
  createReadStream: gracefulfs.createReadStream,
  promises: {
    stat: promisify(gracefulfs.stat),
    readdir: promisify(gracefulfs.readdir),
  },
};

export async function filesFromPaths(
  paths: string | Iterable<string>,
  options?:
    | {
        hidden?: boolean | undefined;
        sort?: boolean | undefined;
        fs?: FileSystem | undefined;
      }
    | undefined,
): Promise<FileLike[]> {
  if (typeof paths === 'string') {
    paths = [paths];
  }

  let commonParts;
  const files = [];
  for (const p of paths) {
    for await (const file of filesFromPath(p, options)) {
      files.push(file);
      const nameParts = file.name.split(path.sep);
      if (commonParts == null) {
        commonParts = nameParts.slice(0, -1);
        continue;
      }
      for (let i = 0; i < commonParts.length; i++) {
        if (commonParts[i] !== nameParts[i]) {
          commonParts = commonParts.slice(0, i);
          break;
        }
      }
    }
  }
  const commonPath = `${(commonParts ?? []).join('/')}/`;
  const commonPathFiles = files.map((f) => ({
    ...f,
    name:
      path.sep === '\\'
        ? f.name.split(path.sep).join('/').slice(commonPath.length)
        : f.name.slice(commonPath.length),
  }));
  return options?.sort == null || options?.sort === true
    ? commonPathFiles.sort((a, b) =>
        a.name === b.name ? 0 : a.name > b.name ? 1 : -1,
      )
    : commonPathFiles;
}

async function* filesFromPath(filepath, options) {
  filepath = path.resolve(filepath);
  const fs = options?.fs ?? defaultfs;
  const hidden = options?.hidden ?? false;

  const filter = (filepath) => {
    if (!hidden && path.basename(filepath).startsWith('.')) return false;
    return true;
  };

  const name = filepath;
  const stat = await fs.promises.stat(name);

  if (!filter(name)) {
    return;
  }

  if (stat.isFile()) {
    yield {
      name,
      stream: () => Readable.toWeb(fs.createReadStream(name)),
      size: stat.size,
    };
  } else if (stat.isDirectory()) {
    yield* filesFromDir(name, filter, options);
  }
}

async function* filesFromDir(dir, filter, options?) {
  const fs = options?.fs ?? defaultfs;
  const entries = await fs.promises.readdir(path.join(dir), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!filter(entry.name)) {
      continue;
    }

    if (entry.isFile()) {
      const name = path.join(dir, entry.name);
      const { size } = await fs.promises.stat(name);
      yield {
        name,
        stream: () => Readable.toWeb(fs.createReadStream(name)),
        size,
      };
    } else if (entry.isDirectory()) {
      yield* filesFromDir(path.join(dir, entry.name), filter);
    }
  }
}
