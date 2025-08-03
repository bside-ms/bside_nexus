import { createHash } from 'crypto';

interface TimestampValidationResult {
    success: boolean;
    message?: string;
}

export const isValidTimestamp = (timestamp: string): TimestampValidationResult => {
    if (!timestamp) {
        return { success: false, message: 'Es ist ein Fehler aufgetreten.' };
    }

    const time = new Date(timestamp);
    if (isNaN(time.getTime())) {
        return { success: false, message: 'Ungültiges Zeitstempel-Format' };
    }
    const now = new Date();
    const fourtyFiveMinutesAhead = new Date(now.getTime() + 45 * 60 * 1000);

    if (time > fourtyFiveMinutesAhead) {
        return { success: false, message: 'Der Zeitstempel liegt zu weit in der Zukunft' };
    }

    return { success: true };
};

export function shortVerificationCode(guid: string): string {
    const hash = createHash('sha256').update(guid).digest();
    let num = 0;
    for (let i = 0; i < 8; i++) {
        // @ts-expect-error Hash is a Buffer, which is iterable.
        // eslint-disable-next-line no-bitwise
        num = (num * 256 + hash[i]) >>> 0;
    }
    return (num % 100_000_000).toString().padStart(8, '0');
}
