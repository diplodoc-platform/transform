import {readFileSync, writeFileSync} from 'fs';
import {readFile, writeFile} from 'fs/promises';

import {FsContext} from './typings';
import {isFileExists, isFileExistsAsync} from './utilsFS';

export class DefaultFsContext implements FsContext {
    exist(path: string): boolean {
        return isFileExists(path);
    }

    read(path: string): string {
        return readFileSync(path, 'utf8');
    }

    write(path: string, content: string): void {
        writeFileSync(path, content, {
            encoding: 'utf8',
        });
    }

    async existAsync(path: string): Promise<boolean> {
        return await isFileExistsAsync(path);
    }

    async readAsync(path: string): Promise<string> {
        return readFile(path, 'utf8');
    }

    async writeAsync(path: string, content: string): Promise<void> {
        writeFile(path, content, {
            encoding: 'utf8',
        });
    }
}

export const defaultFsContext = new DefaultFsContext();
