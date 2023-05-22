import {bold} from 'chalk';
import {log} from '../log';
import transform from '../index';
import changelogPlugin from '../plugins/changelog';
import imsize from '../plugins/imsize';

const BLOCK_START = '{% changelog %}';
const BLOCK_END = '{% endChangelog %}\n';

function parseChangeLog(str: string) {
    const {
        result: {changelogs = []},
    } = transform(str, {
        plugins: [changelogPlugin, imsize],
    });
    return changelogs;
}

const changelogs = (origStr: string, _builtVars: Record<string, unknown>, path?: string) => {
    let str = origStr;
    let lastPos = 0;
    const rawChangelogs = [];

    while (true) {
        const pos = str.indexOf(BLOCK_START, lastPos);
        if (pos === -1) {
            break;
        }
        const endPos = str.indexOf(BLOCK_END, pos + BLOCK_START.length);
        if (endPos === -1) {
            log.error(`Changelog block must be closed${path ? ` in ${bold(path)}` : ''}`);
            break;
        }

        const changelog = str.slice(pos, endPos + BLOCK_END.length);

        rawChangelogs.push(changelog);

        str = str.slice(0, pos) + str.slice(endPos + BLOCK_END.length);
    }

    const changelogs = parseChangeLog(rawChangelogs.join('\n\n'));

    return {output: str, changelogs};
};

export = changelogs;
