import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface ConvertOptions {
    timeoutMs?: number; // default 15000
}

const withTimeout = async <T>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let to: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
        to = setTimeout(() => reject(new Error(msg)), ms);
    });
    try {
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(to!);
    }
};

/**
 * Converts a DOCX buffer to PDF by invoking LibreOffice (soffice) in headless mode.
 * Returns null if soffice is not available or conversion fails.
 */
export const convertDocxToPdfWithSoffice = async (docxBuffer: Buffer, opts: ConvertOptions = {}): Promise<Buffer | null> => {
    const timeoutMs = opts.timeoutMs ?? 15000;

    // Prepare temp paths
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'docx2pdf-'));
    const inPath = path.join(tmpRoot, 'input.docx');
    const outPath = path.join(tmpRoot, 'input.pdf');
    try {
        await fs.writeFile(inPath, docxBuffer);

        // Spawn soffice
        const args = ['--headless', '--nologo', '--nolockcheck', '--nodefault', '--convert-to', 'pdf', '--outdir', tmpRoot, inPath];
        const child = spawn('soffice', args, { stdio: 'ignore' });

        const result: Promise<void> = new Promise((resolve, reject) => {
            child.on('error', (err) => reject(err));
            child.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`soffice exited with code ${code}`));
                }
            });
        });

        // Timeout handling
        const timed = withTimeout(result, timeoutMs, 'soffice conversion timeout');
        await timed;

        // Read output
        const pdf = await fs.readFile(outPath).catch(() => null);
        return pdf;
    } catch {
        return null;
    } finally {
        // Cleanup temp directory
        try {
            const files = await fs.readdir(tmpRoot).catch(() => []);
            for (const f of files) {
                try {
                    await fs.unlink(path.join(tmpRoot, f));
                } catch {
                    /* ignore */
                }
            }
            await fs.rmdir(tmpRoot).catch(() => undefined);
        } catch {
            /* ignore */
        }
    }
};

export default convertDocxToPdfWithSoffice;
