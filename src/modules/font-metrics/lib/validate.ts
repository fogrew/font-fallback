import { FontParseError, MAX_DECODED_BYTES, MAX_FONT_BYTES } from './model';

export function validateFontBuffer(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_FONT_BYTES) throw new FontParseError('too-large');
  if (buffer.byteLength < 12) throw new FontParseError('invalid-font');
  const view = new DataView(buffer);
  const signature = view.getUint32(0);
  const isWoff = signature === 0x774f4646;
  const isWoff2 = signature === 0x774f4632;
  if (isWoff || isWoff2) {
    if (buffer.byteLength < (isWoff2 ? 48 : 44) || view.getUint32(8) !== buffer.byteLength) {
      throw new FontParseError('invalid-font');
    }
    if (view.getUint32(16) > MAX_DECODED_BYTES) throw new FontParseError('too-large');
    if (isWoff2 && view.getUint32(20) > buffer.byteLength - 48) {
      throw new FontParseError('invalid-font');
    }
    if (isWoff) {
      const count = view.getUint16(12);
      if (44 + count * 20 > buffer.byteLength) throw new FontParseError('invalid-font');
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
    }
    return;
  }
  if (signature !== 0x00010000 && signature !== 0x4f54544f && signature !== 0x74727565) {
    throw new FontParseError('unsupported-format');
  }
  const count = view.getUint16(4);
  if (count === 0 || 12 + count * 16 > buffer.byteLength) throw new FontParseError('invalid-font');
  for (let i = 0; i < count; i++) {
    const pos = 12 + i * 16;
    if (view.getUint32(pos + 8) + view.getUint32(pos + 12) > buffer.byteLength) {
      throw new FontParseError('invalid-font');
    }
  }
}
