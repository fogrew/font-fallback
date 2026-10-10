export function isCollection(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'ttcf';
}

export function collectionMember(bytes: Uint8Array, index: number): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(8);
  if (index < 0 || index >= count) throw new Error('Collection member out of range');
  const start = view.getUint32(12 + index * 4);
  const tableCount = view.getUint16(start + 4);
  if (tableCount > 256) throw new Error('Too many tables');
  const headerSize = 12 + tableCount * 16;
  const parts: Uint8Array[] = [];
  const header = new Uint8Array(headerSize);
  header.set(bytes.subarray(start, start + 12));
  let offset = headerSize;
  for (let table = 0; table < tableCount; table++) {
    const record = start + 12 + table * 16;
    const from = view.getUint32(record + 8);
    const length = view.getUint32(record + 12);
    if (from + length > bytes.length) throw new Error('Table outside the collection');
    header.set(bytes.subarray(record, record + 8), 12 + table * 16);
    new DataView(header.buffer).setUint32(12 + table * 16 + 8, offset);
    new DataView(header.buffer).setUint32(12 + table * 16 + 12, length);
    parts.push(bytes.subarray(from, from + length));
    const padded = Math.ceil(length / 4) * 4;
    if (padded > length) parts.push(new Uint8Array(padded - length));
    offset += padded;
  }
  const result = new Uint8Array(offset);
  result.set(header);
  let at = headerSize;
  for (const part of parts) {
    result.set(part, at);
    at += part.length;
  }
  return result;
}
