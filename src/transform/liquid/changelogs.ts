import {bold} from 'chalk';
import {log} from '../log';
import changelogPlugin from '../plugins/changelog';
import imsize from '../plugins/imsize';
import initMarkdownit from '../md';
import path from 'path';
import fs from 'fs';

const BLOCK_START = '{% changelog %}';
const BLOCK_END = '{% endChangelog %}\n';

function parseChangelogs(str: string) {
    const {parse, compile, env} = initMarkdownit({
        plugins: [changelogPlugin, imsize],
        enableChangelogs: true,
    });

    compile(parse(str));

    return env.changelog || [];
}

const changelogs = (origStr: string, _builtVars: Record<string, unknown>, filepath?: string) => {
    let str = origStr;
    let lastPos = 0;
    const rawChanges = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const pos = str.indexOf(BLOCK_START, lastPos);
        lastPos = pos;
        if (pos === -1) {
            break;
        }
        const endPos = str.indexOf(BLOCK_END, pos + BLOCK_START.length);
        if (endPos === -1) {
            log.error(`Changelog block must be closed${filepath ? ` in ${bold(filepath)}` : ''}`);
            break;
        }

        const change = str.slice(pos, endPos + BLOCK_END.length);

        rawChanges.push(change);

        str = str.slice(0, pos) + str.slice(endPos + BLOCK_END.length);
    }

    const changes = parseChangelogs(rawChanges.join('\n\n'));

    changes.forEach((change) => {
        if (!filepath) return;
        const target = path.join(path.dirname(filepath), `change-${change.date}.json`);
        fs.writeFileSync(target, JSON.stringify(change));
    });

    return {output: str, changes};
};

export = changelogs;
