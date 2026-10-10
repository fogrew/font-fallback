import { deflateRawSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { readTarGz, readZip } from './archive';

function tarEntry(name: string, content: string): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 'latin1');
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 'latin1');
  header.write('0', 156, 'latin1');
  const body = Buffer.alloc(Math.ceil(content.length / 512) * 512);
  body.write(content, 0, 'latin1');
  return Buffer.concat([header, body]);
}

function zipOf(entries: [string, string][]): Buffer {
  const locals: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = deflateRawSync(Buffer.from(content));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    const record = Buffer.concat([local, Buffer.from(name), data]);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(content.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    directory.push(Buffer.concat([entry, Buffer.from(name)]));
    locals.push(record);
    offset += record.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, end]);
}

describe('readTarGz', () => {
  it('reads regular files and skips padding', () => {
    const tar = Buffer.concat([
      tarEntry('dir/a.ttf', 'AAAA'),
      tarEntry('b.txt', 'x'.repeat(600)),
      Buffer.alloc(1024),
    ]);
    const files = readTarGz(gzipSync(tar));
    expect([...files.keys()]).toEqual(['dir/a.ttf', 'b.txt']);
    expect(files.get('dir/a.ttf')?.toString()).toBe('AAAA');
    expect(files.get('b.txt')?.length).toBe(600);
  });
});

describe('readZip', () => {
  it('reads deflated entries', () => {
    const files = readZip(
      zipOf([
        ['ttf/DejaVuSans.ttf', 'sans'],
        ['ttf/DejaVuSerif.ttf', 'serif'],
      ]),
    );
    expect(files.get('ttf/DejaVuSans.ttf')?.toString()).toBe('sans');
    expect(files.get('ttf/DejaVuSerif.ttf')?.toString()).toBe('serif');
  });

  it('rejects data that is not a zip archive', () => {
    expect(() => readZip(Buffer.from('nope'.repeat(20)))).toThrow();
  });
});
