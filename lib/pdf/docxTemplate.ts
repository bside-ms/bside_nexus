/* eslint-disable no-template-curly-in-string */

import type { ProtocolDetails } from '@/lib/db/keyProtocolActions';
import { formatKeyNr, KEY_LINE_TYPE_LABELS, KEY_PROTOCOL_MAX_LINES } from '@/lib/key/constants';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';

export type ReceiptPlaceholders = Record<string, string>;

export type TemplateKind = 'issuance' | 'return';

export const getTemplateAbsolutePath = (kind: TemplateKind): string => {
    const file = kind === 'issuance' ? 'IssuerTemplate.docx' : 'ReturnTemplate.docx';
    return path.join(process.cwd(), 'public', 'pdfTemplates', file);
};

// Both templates use the same placeholders.
export const buildReceiptPlaceholders = (details: ProtocolDetails): ReceiptPlaceholders => {
    const { protocol, protocolType, items } = details;
    const recipient = protocol.recipient;

    const placeholders: ReceiptPlaceholders = {
        '${Name}': recipient.name,
        '${ProfileNr}': recipient.profileNumber === null ? '' : String(recipient.profileNumber),
        '${Address}': recipient.address,
        '${Mail}': recipient.mail,
        '${Phone}': recipient.phone,
        '${IssuerName}': protocol.issuerName ?? '',
        '${ProtocolId}': protocol.protocolNumber,
    };

    for (let index = 0; index < KEY_PROTOCOL_MAX_LINES; index++) {
        const row = index + 1;
        const item = items[index];
        let keyId = '';
        let third = '';
        if (item !== undefined) {
            keyId = item.lineType === 'transponder' ? (item.transponderSerial ?? '') : item.keyNr === null ? '' : formatKeyNr(item.keyNr);
            third = protocolType === 'issuance' ? KEY_LINE_TYPE_LABELS[item.lineType] : (item.issuanceProtocolNumber ?? '');
        }
        placeholders[`\${R${row}KeyId}`] = keyId;
        placeholders[`\${R${row}Description}`] = item?.description ?? '';
        placeholders[`\${R${row}KeyType}`] = third;
        placeholders[`\${R${row}Quantity}`] = item === undefined ? '' : String(item.quantity);
    }

    return placeholders;
};

const escapeXml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Fills a DOCX template by replacing placeholders like ${Name} in word/document.xml.
 */
export const fillDocxTemplate = async (templateAbsPath: string, placeholders: ReceiptPlaceholders): Promise<Buffer> => {
    const input = await fs.readFile(templateAbsPath);
    const zip = await JSZip.loadAsync(input);

    const docXmlPath = 'word/document.xml';
    const docXmlFile = zip.file(docXmlPath);
    if (!docXmlFile) {
        throw new Error('Template document.xml not found in DOCX');
    }

    let xml = await docXmlFile.async('string');
    // Replace all placeholders
    for (const [key, val] of Object.entries(placeholders)) {
        if (!key) {
            continue;
        }
        const safeVal = (val ?? '').toString();
        // Replace every occurrence
        xml = xml.split(key).join(escapeXml(safeVal));
    }
    zip.file(docXmlPath, xml);

    const output = await zip.generateAsync({ type: 'nodebuffer' });
    return output;
};

export default fillDocxTemplate;
