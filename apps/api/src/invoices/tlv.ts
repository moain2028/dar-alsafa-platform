import { BadRequestException } from '@nestjs/common';

export function encodeTlv(fields: Array<{ tag: number; value: string | Buffer }>): string {
  const chunks: Buffer[] = [];
  for (const { tag, value } of fields) {
    if (!Number.isInteger(tag) || tag < 1 || tag > 255) throw new BadRequestException('Invalid TLV tag');
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
    if (bytes.length > 255) throw new BadRequestException(`TLV value ${tag} exceeds one-byte length`);
    chunks.push(Buffer.from([tag, bytes.length]), bytes);
  }
  return Buffer.concat(chunks).toString('base64');
}

export function decodeTlv(base64: string): Map<number, Buffer> {
  const input = Buffer.from(base64, 'base64');
  const output = new Map<number, Buffer>();
  let offset = 0;
  while (offset < input.length) {
    if (offset + 2 > input.length) throw new Error('Truncated TLV header');
    const tag = input[offset++];
    const length = input[offset++];
    if (offset + length > input.length) throw new Error('Truncated TLV value');
    if (output.has(tag)) throw new Error('Duplicate TLV tag');
    output.set(tag, input.subarray(offset, offset + length));
    offset += length;
  }
  return output;
}
