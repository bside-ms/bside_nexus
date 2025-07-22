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
