import {buildSync} from 'esbuild';

import nodeParser from '../src/transform/md';
import {createParser as browserParser} from '../src/transform/browser/standard';
import {log} from '../src/transform/browser/diagnostics';

beforeEach(() => log.clear());

test.each([
    '# Title {#stable}\n\nBody **bold**.',
    '[*api]: Definition.\n\nUses [API](*api).',
    '{% file src="../download.bin" name="download.bin" %}',
    ':::visibility human\nVisible.\n:::\n\n:::visibility agent\nHidden.\n:::',
    '{% note info %}\n\nBody\n\n{% endnote %}',
    '#|\n|| `a|b` {.cell-align-center} | right ||\n|#',
    '![Image](image.png "Title" =20x30)',
    '{% cut "Details" %}\n\nBody\n\n{% endcut %}',
    '{% list tabs %}\n\n- First\n\n  Body\n\n- Second\n\n  Other\n\n{% endlist %}',
])('actual standard callbacks retain Node output: %s', (source) => {
    for (const enableMarkdownAttrs of [false, true]) {
        const options = {enableMarkdownAttrs, generateID: () => 'fixed'};
        const expected = nodeParser({...options, preprocessors: []});
        const actual = browserParser(options);
        expect(actual.compileDocument(actual.parseDocument(source))).toBe(
            expected.compileDocument(expected.parseDocument(source)),
        );
    }
});

test('standard source binds actual browser branches without Node wrappers or helpers', () => {
    const {metafile} = buildSync({
        entryPoints: ['src/transform/browser/standard-plugins.ts'],
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false,
        metafile: true,
    });
    const inputs = Object.keys(metafile.inputs).filter((path) => !path.startsWith('(disabled):'));
    for (const path of inputs) {
        expect(path).not.toMatch(
            /(?:utilsFS|[/\\]liquid[/\\]|[/\\]chalk[/\\]|plugins[/\\]utils\.ts|[/\\]document-context\.ts|[/\\]log\.ts|[/\\]deprecation\.ts|plugins[/\\](?:includes|images)[/\\])/,
        );
    }
    expect(Object.values(metafile.outputs).flatMap(({imports}) => imports)).toEqual([]);
});
