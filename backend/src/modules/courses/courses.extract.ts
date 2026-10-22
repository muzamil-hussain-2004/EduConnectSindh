import { PDFParse } from 'pdf-parse';
import { logger } from '../../config/logger';

const MAX_TEXT_CHARS = 60_000;

// Text is pulled out of PDFs once at upload time so the course assistant can answer from the slides.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    return text.replace(/\s+\n/g, '\n').trim().slice(0, MAX_TEXT_CHARS);
  } catch (err) {
    // A scanned or odd PDF is still a valid handout; it just gives the assistant nothing to read.
    logger.warn({ err }, 'Could not extract text from PDF');
    return '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export const clipText = (text: string) => text.trim().slice(0, MAX_TEXT_CHARS);
