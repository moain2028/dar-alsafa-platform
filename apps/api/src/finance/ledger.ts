import { BadRequestException } from '@nestjs/common';
import { JournalEntry, JournalLine } from '../entities';

export function assertBalanced(lines: Array<Pick<JournalLine, 'debitHalalas' | 'creditHalalas'>>): void {
  if (lines.length < 2) throw new BadRequestException('القيد المحاسبي يحتاج طرفين على الأقل');
  const debit = lines.reduce((sum, line) => sum + line.debitHalalas, 0);
  const credit = lines.reduce((sum, line) => sum + line.creditHalalas, 0);
  if (debit !== credit || debit <= 0) throw new BadRequestException('القيد المحاسبي غير متوازن');
  for (const line of lines) {
    if (line.debitHalalas < 0 || line.creditHalalas < 0 || (line.debitHalalas > 0 && line.creditHalalas > 0)) {
      throw new BadRequestException('سطر محاسبي غير صالح');
    }
  }
}

export function entryTotals(entry: JournalEntry) {
  return {
    debitHalalas: entry.lines.reduce((sum, line) => sum + line.debitHalalas, 0),
    creditHalalas: entry.lines.reduce((sum, line) => sum + line.creditHalalas, 0),
  };
}
