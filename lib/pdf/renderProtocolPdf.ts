import type { ProtocolDetails } from '@/lib/db/keyProtocolQueries';
import { buildReceiptPlaceholders, fillDocxTemplate, getTemplateAbsolutePath } from '@/lib/pdf/docxTemplate';
import { convertDocxToPdfWithSoffice } from '@/lib/pdf/sofficeConverter';

export const isDocxEnabled = (): boolean => {
    const val = (process.env.PDF_DOCX_ENABLED ?? '').toString().toLowerCase().trim();
    return val === 'true' || val === '1' || val === 'yes' || val === 'on';
};

/**
 * Tries to render a PDF from the DOCX template. If DOCX→PDF conversion
 * is not configured, returns null so that the caller can fallback to
 * the lightweight PDF generator.
 */
export const renderDocxPdfOrNull = async (details: ProtocolDetails, issuerName: string): Promise<Buffer | null> => {
    const enabled = isDocxEnabled();
    if (!enabled) {
        return null;
    }

    // Choose template by protocol type
    const kind = details.protocol?.protocolType === 'issuance' ? 'issuance' : 'return';
    const templatePath = getTemplateAbsolutePath(kind);
    const placeholders = buildReceiptPlaceholders(details, issuerName);
    try {
        const filledDocx = await fillDocxTemplate(templatePath, placeholders);
        const pdf = await convertDocxToPdfWithSoffice(filledDocx, { timeoutMs: Number(process.env.PDF_TIMEOUT_MS ?? 15000) });
        return pdf; // may be null on failure
    } catch {
        return null;
    }
};

export default renderDocxPdfOrNull;
