import type { ProtocolDetails } from '@/lib/db/keyProtocolActions';
import { buildReceiptPlaceholders, fillDocxTemplate, getTemplateAbsolutePath } from '@/lib/pdf/docxTemplate';
import { convertDocxToPdfWithSoffice } from '@/lib/pdf/sofficeConverter';

export const isDocxEnabled = (): boolean => {
    const val = (process.env.PDF_DOCX_ENABLED ?? '').toString().toLowerCase().trim();
    return val === 'true' || val === '1' || val === 'yes' || val === 'on';
};

/**
 * Renders the receipt from the DOCX template.
 */
export const renderDocxPdfOrNull = async (details: ProtocolDetails): Promise<Buffer | null> => {
    const enabled = isDocxEnabled();
    if (!enabled) {
        return null;
    }

    // Losses use the return template, like the paper receipts.
    const kind = details.protocolType === 'issuance' ? 'issuance' : 'return';
    const templatePath = getTemplateAbsolutePath(kind);
    const placeholders = buildReceiptPlaceholders(details);
    try {
        const filledDocx = await fillDocxTemplate(templatePath, placeholders);
        const pdf = await convertDocxToPdfWithSoffice(filledDocx, { timeoutMs: Number(process.env.PDF_TIMEOUT_MS ?? 15000) });
        return pdf; // null on failure
    } catch {
        return null;
    }
};

export default renderDocxPdfOrNull;
