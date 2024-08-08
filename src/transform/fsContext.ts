import {readFileSync, writeFileSync} from 'fs';

import {FsContext} from './typings';
import {isFileExists} from './utilsFS';

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
}

export const defaultFsContext = new DefaultFsContext();
