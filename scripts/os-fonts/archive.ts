import { gunzipSync, inflateRawSync } from 'node:zlib';

const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

export function readTarGz(archive: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(archive);
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (from: number, length: number) =>
      header
        .subarray(from, from + length)
        .toString('latin1')
        .replace(/\0.*$/s, '');
    const size = Number.parseInt(text(124, 12).trim() || '0', 8);
    if (!Number.isFinite(size) || size < 0 || size > MAX_ENTRY_BYTES) {
      throw new Error('Invalid tar entry size');
    }
    const type = text(156, 1);
    const prefix = text(345, 155);
    const name = prefix ? `${prefix}/${text(0, 100)}` : text(0, 100);
    const start = offset + 512;
    if ((type === '0' || type === '') && start + size <= tar.length) {
      files.set(name, tar.subarray(start, start + size));
    }
    offset = start + Math.ceil(size / 512) * 512;
  }
  return files;
}

export function readZip(archive: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let end = -1;
  for (let at = archive.length - 22; at >= Math.max(0, archive.length - 65557); at--) {
    if (archive.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error('Not a zip archive');
  const count = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  for (let index = 0; index < count; index++) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid zip directory');
    const method = archive.readUInt16LE(offset + 10);
    const compressed = archive.readUInt32LE(offset + 20);
    const size = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const local = archive.readUInt32LE(offset + 42);
    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    if (size > MAX_ENTRY_BYTES) throw new Error('Zip entry too large');
    const dataStart =
      local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const data = archive.subarray(dataStart, dataStart + compressed);
    if (method === 0) files.set(name, data);
    else if (method === 8)
      files.set(name, inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }));
    else throw new Error(`Unsupported zip method ${method}`);
  }
  return files;
}
