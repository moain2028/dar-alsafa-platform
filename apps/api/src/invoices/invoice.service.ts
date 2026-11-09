import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { Branch, Invoice, Order } from '../entities';
import { halalasToSar } from '../common/domain';
import { encodeTlv } from './tlv';

function xmlEscape(value: string): string {
  return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
}

export interface InvoiceSecurityFields { invoiceHash?: string; signature?: string; publicKey?: string; zatcaSignature?: string }

@Injectable()
export class InvoiceService {
  constructor(@InjectRepository(Invoice) private invoices: Repository<Invoice>, private config: ConfigService) {}

  buildTlv(order: Order, branch: Branch, security: InvoiceSecurityFields = {}): string {
    const fields = [
      { tag: 1, value: this.config.get('ZATCA_SELLER_NAME', 'مطاعم دار الصفاء') },
      { tag: 2, value: branch.vatNumber || this.config.getOrThrow<string>('ZATCA_VAT_NUMBER') },
      { tag: 3, value: order.createdAt.toISOString().replace(/\.\d{3}Z$/, 'Z') },
      { tag: 4, value: halalasToSar(order.totalHalalas) },
      { tag: 5, value: halalasToSar(order.vatHalalas) },
    ];
    if (security.invoiceHash) fields.push({ tag: 6, value: security.invoiceHash });
    if (security.signature) fields.push({ tag: 7, value: security.signature });
    if (security.publicKey) fields.push({ tag: 8, value: security.publicKey });
    if (security.zatcaSignature) fields.push({ tag: 9, value: security.zatcaSignature });
    return encodeTlv(fields);
  }

  buildXml(order: Order, branch: Branch, uuid: string, previousHash: string): string {
    const issueDate = order.createdAt.toISOString();
    const lines = order.items.map((item, index) => `
    <cac:InvoiceLine><cbc:ID>${index + 1}</cbc:ID><cbc:InvoicedQuantity>${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${halalasToSar(item.totalHalalas)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${xmlEscape(item.name)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="SAR">${halalasToSar(item.unitPriceHalalas)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID><cbc:ID>${xmlEscape(order.orderNumber)}</cbc:ID><cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate.slice(0, 10)}</cbc:IssueDate><cbc:IssueTime>${issueDate.slice(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${previousHash}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(branch.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${halalasToSar(order.vatHalalas)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${halalasToSar(order.subtotalHalalas + order.deliveryFeeHalalas - order.discountHalalas)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${halalasToSar(order.vatHalalas)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>15</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="SAR">${halalasToSar(order.subtotalHalalas)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="SAR">${halalasToSar(order.subtotalHalalas + order.deliveryFeeHalalas - order.discountHalalas)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="SAR">${halalasToSar(order.totalHalalas)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="SAR">${halalasToSar(order.totalHalalas)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}
</Invoice>`;
  }

  async issue(order: Order, branch: Branch, manager?: EntityManager): Promise<Invoice> {
    const repo = manager ? manager.getRepository(Invoice) : this.invoices;
    const previous = await repo.find({ order: { issueDate: 'DESC' }, take: 1 });
    const previousHash = previous[0]?.hash || this.config.getOrThrow<string>('ZATCA_PREVIOUS_HASH');
    const uuid = randomUUID();
    const xml = this.buildXml(order, branch, uuid, previousHash);
    const hash = createHash('sha256').update(Buffer.from(xml, 'utf8')).digest('base64');
    const invoice = repo.create({
      orderId: order.id, invoiceNumber: `INV-${order.orderNumber}`, uuid, issueDate: order.createdAt,
      xml, hash, previousHash, qrBase64: this.buildTlv(order, branch),
      complianceStatus: 'DEVELOPMENT_REQUIRES_SIGNED_XML_AND_ZATCA_ONBOARDING',
    });
    // Hash is over the pre-signature XML; production signing must follow ZATCA's canonicalization rules.
    return repo.save(invoice);
  }
}
