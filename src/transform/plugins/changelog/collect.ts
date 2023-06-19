import {bold} from 'chalk';
import {ChangelogItem} from './types';
import initMarkdownit from '../../md';
import changelogPlugin from './index';
import imsize from '../imsize';
import {MarkdownItPluginOpts} from '../typings';

const BLOCK_START = '{% changelog %}';
const BLOCK_END = '{% endchangelog %}\n';

function parseChangelogs(str: string, path?: string) {
    const {parse, compile, env} = initMarkdownit({
        plugins: [changelogPlugin, imsize],
        extractChangelogs: true,
        path,
    });

    compile(parse(str));

    return env.changelogs || [];
}

type Options = Pick<MarkdownItPluginOpts, 'path' | 'log'> & {
    changelogs?: ChangelogItem[];
    extractChangelogs?: boolean;
};

const collect = (input: string, {path: filepath, log, changelogs, extractChangelogs}: Options) => {
    let result = input;
    let lastPos = 0;
    const rawChanges = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const pos = result.indexOf(BLOCK_START, lastPos);
        lastPos = pos;
        if (pos === -1) {
            break;
        }
        const endPos = result.indexOf(BLOCK_END, pos + BLOCK_START.length);
        if (endPos === -1) {
            log.error(`Changelog block must be closed${filepath ? ` in ${bold(filepath)}` : ''}`);
            break;
        }

        const change = result.slice(pos, endPos + BLOCK_END.length);

        rawChanges.push(change);

        result = result.slice(0, pos) + result.slice(endPos + BLOCK_END.length);
    }

    if (rawChanges.length && changelogs && extractChangelogs) {
        const parsedChangelogs = parseChangelogs(rawChanges.join('\n\n'), filepath);
        if (parsedChangelogs.length !== rawChanges.length) {
            log.error(
                `Parsed cahngelogs less than expected${filepath ? ` in ${bold(filepath)}` : ''}`,
            );
        }
        changelogs.push(...parsedChangelogs);
    }

    return result;
};

export = collect;
