import { describe, expect, it } from 'vitest';
import { detectFileType } from '../../src/shared/utils/fileType';

describe('detectFileType', () => {
  it('recognises JPEG, PNG and PDF by their first bytes', () => {
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))?.mimeType).toBe(
      'image/jpeg',
    );
    expect(
      detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))?.mimeType,
    ).toBe('image/png');
    expect(detectFileType(Buffer.from('%PDF-1.7\n'))?.extension).toBe('pdf');
  });

  it('rejects everything else, including executables and scripts', () => {
    expect(detectFileType(Buffer.from('MZ\x90\x00'))).toBeNull();
    expect(detectFileType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});
