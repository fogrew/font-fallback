import { FontParseError, MAX_DECODED_BYTES, MAX_FONT_BYTES, MAX_TABLES } from './model';

const WOFF2_HEADER_BYTES = 48;
const WOFF2_GLYF_INDEX = 10;
const WOFF2_LOCA_INDEX = 11;
const WOFF2_CUSTOM_TAG_INDEX = 63;
const TAG_GLYF = 0x676c7966;
const TAG_LOCA = 0x6c6f6361;

function readBase128(view: DataView, start: number): { value: number; next: number } {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (start + i >= view.byteLength) throw new FontParseError('invalid-font');
    const byte = view.getUint8(start + i);
    if (i === 0 && byte === 0x80) throw new FontParseError('invalid-font');
    if (value > 0x01ffffff) throw new FontParseError('invalid-font');
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: start + i + 1 };
  }
  throw new FontParseError('invalid-font');
}

function validateWoff2(view: DataView): void {
  const length = view.byteLength;
  if (length < WOFF2_HEADER_BYTES || view.getUint32(8) !== length) {
    throw new FontParseError('invalid-font');
  }
  const count = view.getUint16(12);
  if (count === 0 || count > MAX_TABLES) throw new FontParseError('invalid-font');
  if (view.getUint32(16) > MAX_DECODED_BYTES) throw new FontParseError('too-large');
  let pos = WOFF2_HEADER_BYTES;
  let originalBytes = 0;
  let decodedBytes = 0;
  for (let i = 0; i < count; i++) {
    if (pos >= length) throw new FontParseError('invalid-font');
    const flags = view.getUint8(pos++);
    const index = flags & 0x3f;
    const version = flags >> 6;
    let tag: number | null = null;
    if (index === WOFF2_CUSTOM_TAG_INDEX) {
      if (pos + 4 > length) throw new FontParseError('invalid-font');
      tag = view.getUint32(pos);
      pos += 4;
    }
    const original = readBase128(view, pos);
    pos = original.next;
    const isGlyphTable =
      index === WOFF2_GLYF_INDEX ||
      index === WOFF2_LOCA_INDEX ||
      tag === TAG_GLYF ||
      tag === TAG_LOCA;
    let decoded = original.value;
    if (isGlyphTable ? version === 0 : version !== 0) {
      const transformed = readBase128(view, pos);
      pos = transformed.next;
      decoded = transformed.value;
    }
    originalBytes += original.value;
    decodedBytes += decoded;
    if (originalBytes > MAX_DECODED_BYTES || decodedBytes > MAX_DECODED_BYTES) {
      throw new FontParseError('too-large');
    }
  }
  if (view.getUint32(20) > length - pos) throw new FontParseError('invalid-font');
}

export function validateFontBuffer(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_FONT_BYTES) throw new FontParseError('too-large');
  if (buffer.byteLength < 12) throw new FontParseError('invalid-font');
  const view = new DataView(buffer);
  const signature = view.getUint32(0);
  const isWoff = signature === 0x774f4646;
  const isWoff2 = signature === 0x774f4632;
  if (isWoff2) {
    validateWoff2(view);
    return;
  }
  if (isWoff) {
    if (buffer.byteLength < 44 || view.getUint32(8) !== buffer.byteLength) {
      throw new FontParseError('invalid-font');
    }
    if (view.getUint32(16) > MAX_DECODED_BYTES) throw new FontParseError('too-large');
    const count = view.getUint16(12);
    if (count === 0 || count > MAX_TABLES || 44 + count * 20 > buffer.byteLength) {
      throw new FontParseError('invalid-font');
    }
    let decodedBytes = 12 + count * 16;
    for (let i = 0; i < count; i++) {
      const pos = 44 + i * 20;
      const offset = view.getUint32(pos + 4);
      const compressedLength = view.getUint32(pos + 8);
      const originalLength = view.getUint32(pos + 12);
      decodedBytes += originalLength;
      if (decodedBytes > MAX_DECODED_BYTES) throw new FontParseError('too-large');
      if (offset + compressedLength > buffer.byteLength || compressedLength > originalLength) {
        throw new FontParseError('invalid-font');
      }
    }
    return;
  }
  if (signature !== 0x00010000 && signature !== 0x4f54544f && signature !== 0x74727565) {
    throw new FontParseError('unsupported-format');
  }
  const count = view.getUint16(4);
  if (count === 0 || count > MAX_TABLES || 12 + count * 16 > buffer.byteLength)
    throw new FontParseError('invalid-font');
  for (let i = 0; i < count; i++) {
    const pos = 12 + i * 16;
    if (view.getUint32(pos + 8) + view.getUint32(pos + 12) > buffer.byteLength) {
      throw new FontParseError('invalid-font');
    }
  }
}
