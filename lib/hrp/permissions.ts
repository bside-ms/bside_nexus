import { differenceInCalendarDays } from 'date-fns';

export function canModifyEntry(contractType: string, entryDate: Date): { allowed: boolean; error?: string } {
    const today = new Date();
    const daysDiff = Math.abs(differenceInCalendarDays(today, entryDate));

    // Strengere Regel für Festangestellte
    if (contractType === 'fixed_salary') {
        if (daysDiff > 7) {
            return { allowed: false, error: 'Änderungen nur 7 Tage rückwirkend möglich.' };
        }
        return { allowed: true };
    }

    // Flexiblere Lösung für stundengenaue Abrechnung
    if (contractType === 'hourly') {
        // Warnung im Frontend anzeigen, aber Backend erlaubt es (außer es ist uralt)
        if (daysDiff > 90) {
            return { allowed: false, error: 'Eintrag zu alt (> 30 Tage).' };
        }
        return { allowed: true };
    }

    return { allowed: false, error: 'Unbekannter Vertragstyp' };
}
