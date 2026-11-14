// Minimal WebDAV client for the Nextcloud folder of the key management.
// It only creates folders and new files. It never overwrites, moves or deletes anything.
// Outside production it writes to "<folder>_Test". Reads fall back to the real folder, the test DB is a prod copy.

import { isProduction } from '@/lib/environment';

interface NextcloudConfig {
    baseUrl: string;
    user: string;
    password: string;
    writeFolder: Array<string>;
    // Tried in this order
    readFolders: Array<Array<string>>;
}

const TEST_FOLDER_SUFFIX = '_Test';

const splitPath = (path: string): Array<string> => path.split('/').filter((segment) => segment.trim() !== '');

const toTestFolder = (folder: Array<string>): Array<string> => [...folder.slice(0, -1), `${folder.at(-1) ?? ''}${TEST_FOLDER_SUFFIX}`];

const getConfig = (): NextcloudConfig | null => {
    const baseUrl = (process.env.NEXTCLOUD_URL ?? '').trim();
    const user = (process.env.NEXTCLOUD_USER ?? '').trim();
    const password = process.env.NEXTCLOUD_APP_PASSWORD ?? '';
    const folder = splitPath(process.env.NEXTCLOUD_KEY_FOLDER ?? '');
    if (baseUrl === '' || user === '' || password === '' || folder.length === 0) {
        return null;
    }
    const writeFolder = isProduction() ? folder : toTestFolder(folder);
    const readFolders = isProduction() ? [folder] : [writeFolder, folder];
    return { baseUrl: baseUrl.replace(/\/+$/, ''), user, password, writeFolder, readFolders };
};

export const isNextcloudConfigured = (): boolean => getConfig() !== null;

// For the integrations page.
export const getNextcloudFolders = (): { write: string; read: Array<string> } | null => {
    const config = getConfig();
    return config === null ? null : { write: config.writeFolder.join('/'), read: config.readFolders.map((folder) => folder.join('/')) };
};

const requireConfig = (): NextcloudConfig => {
    const config = getConfig();
    if (config === null) {
        throw new Error('Nextcloud is not configured');
    }
    return config;
};

// Path segments URL-encoded one by one.
const davUrl = (config: NextcloudConfig, segments: Array<string>): string =>
    `${config.baseUrl}/remote.php/dav/files/${encodeURIComponent(config.user)}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;

const authHeader = (config: NextcloudConfig): string => `Basic ${Buffer.from(`${config.user}:${config.password}`).toString('base64')}`;

// Creates the write folder and the given subfolder, one level at a time. Existing folders are fine (405).
const ensureFolder = async (config: NextcloudConfig, subfolder: Array<string>): Promise<void> => {
    const all = [...config.writeFolder, ...subfolder];
    for (let depth = 1; depth <= all.length; depth++) {
        const response = await fetch(davUrl(config, all.slice(0, depth)), {
            method: 'MKCOL',
            headers: { Authorization: authHeader(config) },
        });
        if (response.status !== 201 && response.status !== 405) {
            throw new Error(`Nextcloud MKCOL failed with status ${response.status}`);
        }
    }
};

const exists = async (config: NextcloudConfig, segments: Array<string>): Promise<boolean> => {
    const response = await fetch(davUrl(config, segments), { method: 'HEAD', headers: { Authorization: authHeader(config) } });
    if (response.status === 404) {
        return false;
    }
    if (response.ok) {
        return true;
    }
    throw new Error(`Nextcloud HEAD failed with status ${response.status}`);
};

// Characters that Nextcloud or common file systems don't accept in file names.
export const sanitizeFileName = (name: string): string =>
    name
        .replaceAll(/[\\/:*?"<>|]+/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();

/**
 * Uploads a file as a new file. If the name is taken, it tries "name (2).ext", "name (3).ext" and so on.
 * Returns the path below the configured folder.
 */
export const uploadNewFile = async (
    subfolder: string,
    baseName: string,
    extension: string,
    data: ArrayBuffer,
    contentType: string,
): Promise<string> => {
    const config = requireConfig();
    const folderSegments = splitPath(subfolder);
    await ensureFolder(config, folderSegments);

    const cleanBase = sanitizeFileName(baseName);
    for (let attempt = 1; attempt <= 50; attempt++) {
        const fileName = attempt === 1 ? `${cleanBase}.${extension}` : `${cleanBase} (${attempt}).${extension}`;
        const segments = [...folderSegments, fileName];
        // All read folders, so a test upload never hides a real file.
        const taken = await Promise.all(config.readFolders.map((folder) => exists(config, [...folder, ...segments])));
        if (taken.some(Boolean)) {
            continue;
        }
        // If-None-Match makes the server refuse the upload if the file appeared in the meantime.
        const response = await fetch(davUrl(config, [...config.writeFolder, ...segments]), {
            method: 'PUT',
            headers: { Authorization: authHeader(config), 'Content-Type': contentType, 'If-None-Match': '*' },
            body: data,
        });
        if (response.status === 412) {
            continue;
        }
        if (response.status !== 201) {
            throw new Error(`Nextcloud PUT failed with status ${response.status}`);
        }
        return segments.join('/');
    }
    throw new Error('No free file name found in Nextcloud');
};

// Only a 404 moves on to the next read folder.
export const downloadFile = async (path: string): Promise<Response> => {
    const config = requireConfig();
    let lastStatus = 404;
    for (const folder of config.readFolders) {
        const response = await fetch(davUrl(config, [...folder, ...splitPath(path)]), { headers: { Authorization: authHeader(config) } });
        if (response.ok) {
            return response;
        }
        lastStatus = response.status;
        if (response.status !== 404) {
            break;
        }
    }
    throw new Error(`Nextcloud GET failed with status ${lastStatus}`);
};

export interface NextcloudFolderStatus {
    path: string;
    purpose: 'write' | 'read';
    // A number is the HTTP status of a failed check.
    status: 'ok' | 'missing' | number;
}

// Read-only (PROPFIND). Returns null if Nextcloud is not configured.
export const checkNextcloudFolders = async (): Promise<Array<NextcloudFolderStatus> | null> => {
    const config = getConfig();
    if (config === null) {
        return null;
    }
    const folders: Array<{ folder: Array<string>; purpose: 'write' | 'read' }> = [
        { folder: config.writeFolder, purpose: 'write' },
        ...config.readFolders
            .filter((folder) => folder.join('/') !== config.writeFolder.join('/'))
            .map((folder) => ({ folder, purpose: 'read' as const })),
    ];
    return Promise.all(
        folders.map(async ({ folder, purpose }) => {
            const response = await fetch(davUrl(config, folder), {
                method: 'PROPFIND',
                headers: { Authorization: authHeader(config), Depth: '0' },
            });
            let status: NextcloudFolderStatus['status'] = response.status;
            if (response.ok) {
                status = 'ok';
            } else if (response.status === 404) {
                status = 'missing';
            }
            return { path: folder.join('/'), purpose, status };
        }),
    );
};
