import {bold} from 'chalk';
import {ChangelogItem} from './types';
import initMarkdownit from '../../md';
import changelogPlugin from './index';
import imsize from '../imsize';
import {MarkdownItPluginOpts} from '../typings';

const BLOCK_START = '{% changelog %}';
const BLOCK_END = '{% endchangelog %}';

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
    const rawChangelogs = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const startPos = result.indexOf(BLOCK_START, lastPos);
        lastPos = startPos;
        if (startPos === -1) {
            break;
        }

        const endBlockPos = result.indexOf(BLOCK_END, startPos + BLOCK_START.length);
        if (endBlockPos === -1) {
            log.error(`Changelog block must be closed${filepath ? ` in ${bold(filepath)}` : ''}`);
            break;
        }
        let endPos = endBlockPos + BLOCK_END.length;
        if (result[endPos + 1] === '\n') {
            endPos += 1;
        }

        const changelog = result.slice(startPos, endPos);

        rawChangelogs.push(changelog);

        result = result.slice(0, startPos) + result.slice(endPos);
    }

    if (rawChangelogs.length && changelogs && extractChangelogs) {
        const parsedChangelogs = parseChangelogs(rawChangelogs.join('\n\n'), filepath);
        if (parsedChangelogs.length !== rawChangelogs.length) {
            log.error(
                `Parsed changelogs less than expected${filepath ? ` in ${bold(filepath)}` : ''}`,
            );
        }
        changelogs.push(...parsedChangelogs);
    }

    return result;
};

export = collect;
