import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

/**
 * Compare the shipped parser to the pinned distribution, including native field semantics.
 * @param {string} packageRoot - Extracted or installed package directory.
 * @param {string} projectRoot - Development checkout containing reference fixtures.
 * @returns {object} The verified workload counts and field-semantics result.
 */
export function verifyMarkdownItPackage(packageRoot, projectRoot) {
    const packageRequire = createRequire(join(packageRoot, 'package.json'));
    const referenceRequire = createRequire(join(projectRoot, 'package.json'));
    const OptimizedMarkdownIt = packageRequire('./lib/markdown-it-runtime.js').default;
    const ReferenceMarkdownIt = referenceRequire('markdown-it');
    const notices = readFileSync(join(packageRoot, 'lib/markdown-it-runtime.LICENSES.txt'), 'utf8');
    assert.match(notices, /markdown-it@15\.0\.3/);
    assert.match(notices, /linkify-it@/);
    const browserNotices = readFileSync(
        join(packageRoot, 'dist/browser/THIRD_PARTY_LICENSES.txt'),
        'utf8',
    );
    assert.match(browserNotices, /markdown-it@15\.0\.3/);
    assert.match(browserNotices, /Permission is hereby granted, free of charge/);

    const sources = [
        '',
        '# Heading\n\nA *paragraph* with [a link](https://example.org).',
        '[label]: /target "Title"\n\n[link][label]\n\n![image](/image.png)',
        '> quote\n>\n> - first\n> - second\n\n    code\n\n```js\nx()\n```',
        '| first | second |\n| :--- | ---: |\n| one | `two` |',
        'https://example.org\n\nuser@example.org\n\n<!-- comment -->\n<b>x</b>',
        Array.from({length: 8000}, () => 'A long paragraph line with *emphasis*.').join('\n'),
    ];
    const addFixtures = (directory) => {
        for (const entry of readdirSync(directory, {withFileTypes: true})) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) addFixtures(path);
            else if (entry.name.endsWith('.txt')) sources.push(readFileSync(path, 'utf8'));
        }
    };
    addFixtures(join(projectRoot, 'test'));

    for (const options of [{}, {html: true, linkify: true, breaks: true}]) {
        const before = new ReferenceMarkdownIt(options);
        const after = new OptimizedMarkdownIt(options);
        for (const source of sources) {
            const beforeEnv = {};
            const afterEnv = {};
            assert.equal(after.render(source, afterEnv), before.render(source, beforeEnv));
            assert.deepEqual(afterEnv, beforeEnv);
            // JSON retains every token field and nested child without comparing
            // prototypes from two deliberately separate module instances.
            assert.equal(
                JSON.stringify(after.parse(source, {})),
                JSON.stringify(before.parse(source, {})),
            );
            const state = new OptimizedMarkdownIt.StateCore(source, after, {});
            after.core.process(state);
            for (const token of state.tokens) assert.ok(token instanceof OptimizedMarkdownIt.Token);
        }
    }

    const descriptors = (Constructor) => {
        let setterCalls = 0;
        class Derived extends Constructor.Token {
            set content(value) {
                setterCalls++;
            }
        }
        const token = new Derived('text', '', 0);
        assert.equal(setterCalls, 0);
        return Object.getOwnPropertyDescriptors(token);
    };
    assert.deepEqual(descriptors(OptimizedMarkdownIt), descriptors(ReferenceMarkdownIt));
    return {sources: sources.length, optionSets: 2, tokenFieldSemantics: 'unchanged'};
}
