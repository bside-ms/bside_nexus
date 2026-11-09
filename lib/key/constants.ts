export const KEY_ROLE = 'schluesselverwaltung';

export const KEY_PROFILE_KINDS = ['person', 'safe'] as const;
export type KeyProfileKind = (typeof KEY_PROFILE_KINDS)[number];

export const KEY_PROFILE_KIND_LABELS: Record<KeyProfileKind, string> = {
    person: 'Person',
    safe: 'Tresor',
};

export const KEY_PROTOCOL_TYPES = ['issuance', 'return', 'lost'] as const;
export type KeyProtocolType = (typeof KEY_PROTOCOL_TYPES)[number];

export const KEY_PROTOCOL_TYPE_LABELS: Record<KeyProtocolType, string> = {
    issuance: 'Ausgabe',
    return: 'Rückgabe',
    lost: 'Verlust',
};

export const KEY_LINE_TYPES = ['key', 'transponder'] as const;
export type KeyLineType = (typeof KEY_LINE_TYPES)[number];

export const KEY_LINE_TYPE_LABELS: Record<KeyLineType, string> = {
    key: 'Schlüssel',
    transponder: 'Transponder',
};

// The DOCX templates have 4 rows. Larger issuances are split into several protocols.
export const KEY_PROTOCOL_MAX_LINES = 4;

export const isKeyProfileKind = (value: string): value is KeyProfileKind => (KEY_PROFILE_KINDS as ReadonlyArray<string>).includes(value);
export const isKeyProtocolType = (value: string): value is KeyProtocolType => (KEY_PROTOCOL_TYPES as ReadonlyArray<string>).includes(value);
export const toKeyProtocolType = (value: string): KeyProtocolType => (isKeyProtocolType(value) ? value : 'issuance');
export const toKeyProfileKind = (value: string): KeyProfileKind => (isKeyProfileKind(value) ? value : 'person');

// Key numbers are written with two digits on the receipts ("06", "86").
export const formatKeyNr = (keyNr: number): string => String(keyNr).padStart(2, '0');

// In old protocols, transponder names have been used inconsequently ("KDE 164399", "KDE164399").
export const normalizeTransponderSerial = (serial: string): string => serial.replaceAll(/\s+/g, '').toUpperCase();

export const formatProfileName = (profile: { firstName: string; lastName: string | null }): string =>
    [profile.firstName, profile.lastName ?? ''].join(' ').trim();

export const formatProtocolDate = (date: string | null): string => {
    if (date === null) {
        return 'unbekannt';
    }
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
};
