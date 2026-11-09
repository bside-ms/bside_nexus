// Minimal WebDAV client for the Nextcloud folder of the key management.
// It only creates folders and new files. It never overwrites, moves or deletes anything.

interface NextcloudConfig {
    baseUrl: string;
    user: string;
    password: string;
    folder: Array<string>;
}

const splitPath = (path: string): Array<string> => path.split('/').filter((segment) => segment.trim() !== '');

const getConfig = (): NextcloudConfig | null => {
    const baseUrl = (process.env.NEXTCLOUD_URL ?? '').trim();
    const user = (process.env.NEXTCLOUD_USER ?? '').trim();
    const password = process.env.NEXTCLOUD_APP_PASSWORD ?? '';
    const folder = splitPath(process.env.NEXTCLOUD_KEY_FOLDER ?? '');
    if (baseUrl === '' || user === '' || password === '' || folder.length === 0) {
        return null;
    }
    return { baseUrl: baseUrl.replace(/\/+$/, ''), user, password, folder };
};

export const isNextcloudConfigured = (): boolean => getConfig() !== null;

const requireConfig = (): NextcloudConfig => {
    const config = getConfig();
    if (config === null) {
        throw new Error('Nextcloud is not configured');
    }
    return config;
};

// Path segments below the configured folder, URL-encoded one by one.
const davUrl = (config: NextcloudConfig, segments: Array<string>): string =>
    `${config.baseUrl}/remote.php/dav/files/${encodeURIComponent(config.user)}/${[...config.folder, ...segments]
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;

const authHeader = (config: NextcloudConfig): string => `Basic ${Buffer.from(`${config.user}:${config.password}`).toString('base64')}`;

// Creates the configured folder and the given subfolder, one level at a time. Existing folders are fine (405).
const ensureFolder = async (config: NextcloudConfig, subfolder: Array<string>): Promise<void> => {
    const all = [...config.folder, ...subfolder];
    for (let depth = 1; depth <= all.length; depth++) {
        const url = `${config.baseUrl}/remote.php/dav/files/${encodeURIComponent(config.user)}/${all
            .slice(0, depth)
            .map((segment) => encodeURIComponent(segment))
            .join('/')}`;
        const response = await fetch(url, { method: 'MKCOL', headers: { Authorization: authHeader(config) } });
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
        if (await exists(config, segments)) {
            continue;
        }
        // If-None-Match makes the server refuse the upload if the file appeared in the meantime.
        const response = await fetch(davUrl(config, segments), {
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

export const downloadFile = async (path: string): Promise<Response> => {
    const config = requireConfig();
    const response = await fetch(davUrl(config, splitPath(path)), { headers: { Authorization: authHeader(config) } });
    if (!response.ok) {
        throw new Error(`Nextcloud GET failed with status ${response.status}`);
    }
    return response;
};
