export interface DetectedFile {
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  extension: 'jpg' | 'png' | 'pdf';
}

const startsWith = (buffer: Buffer, bytes: number[]) =>
  buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);

// Looks at the first bytes ("magic numbers"), because the filename and the
// Content-Type header are chosen by the uploader and cannot be trusted.
export function detectFileType(buffer: Buffer): DetectedFile | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  return null;
}
