import { describe, expect, it } from 'vitest';
import { collectionMember, isCollection } from './sfnt';

function collectionOf(content: string): Uint8Array {
  const bytes = new Uint8Array(12 + 4 + 12 + 16 + 8);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode('ttcf'), 0);
  view.setUint32(8, 1);
  view.setUint32(12, 16);
  view.setUint32(16, 0x00010000);
  view.setUint16(20, 1);
  bytes.set(new TextEncoder().encode('head'), 28);
  view.setUint32(36, 44);
  view.setUint32(40, content.length);
  bytes.set(new TextEncoder().encode(content), 44);
  return bytes;
}

describe('collectionMember', () => {
  it('recognizes collections', () => {
    expect(isCollection(collectionOf('abcd'))).toBe(true);
    expect(isCollection(new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });

  it('extracts a standalone font with relocated tables', () => {
    const member = collectionMember(collectionOf('abcd'), 0);
    const view = new DataView(member.buffer);
    expect(view.getUint32(0)).toBe(0x00010000);
    expect(view.getUint16(4)).toBe(1);
    const offset = view.getUint32(12 + 8);
    expect(new TextDecoder().decode(member.subarray(offset, offset + 4))).toBe('abcd');
  });

  it('rejects out-of-range members', () => {
    expect(() => collectionMember(collectionOf('abcd'), 1)).toThrow();
  });
});
