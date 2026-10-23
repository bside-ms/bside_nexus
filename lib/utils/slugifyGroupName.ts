const umlauts: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

// "Festival - Finanzen & Förderungen" becomes "festival-finanzen-foerderungen".
const slugifyGroupName = (displayName: string): string =>
    displayName
        .toLowerCase()
        .replaceAll(/[äöüß]/g, (character) => umlauts[character] ?? character)
        .replaceAll(/[^\da-z]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');

export default slugifyGroupName;
