// Kennzeichnung von Admin-Korrekturen.

export const MAX_HRP_COMMENT_LENGTH = 500;

export interface HrpAdminActor {
    userId: string;
    name: string;
    ipAddress: string;
    reason: string;
}

/** Format: `[Korrektur: Name, TT.MM.JJJJ] Begründung`. */
export const buildCorrectionNote = (actor: HrpAdminActor, now = new Date()): string => {
    const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(
        now,
    );
    return `[Korrektur: ${actor.name}, ${date}] ${actor.reason}`;
};

/**
 * Kommentar einer Admin-Buchung.
 * Ein vorhandener Kommentar bleibt vorne und wird bei Bedarf gekürzt.
 */
export const buildCorrectionComment = (note: string, originalComment: string | null): string => {
    const original = originalComment?.trim() ?? '';
    if (original.length === 0) {
        return note.slice(0, MAX_HRP_COMMENT_LENGTH);
    }

    const separator = ' | ';
    const available = MAX_HRP_COMMENT_LENGTH - note.length - separator.length;
    if (available <= 1) {
        return note.slice(0, MAX_HRP_COMMENT_LENGTH);
    }

    const keptOriginal = original.length > available ? `${original.slice(0, available - 1)}…` : original;
    return `${keptOriginal}${separator}${note}`;
};

/** Fehler, dessen Meldung direkt angezeigt werden darf. */
export class HrpValidationError extends Error {}
