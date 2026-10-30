import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Resolve the installed package after this fixture is copied to its consumer.
const packageName = '@diplodoc/transform';
const {default: transform} = await import(packageName);
const {transform: browserTransform} = await import(`${packageName}/browser`);
const {migrateBlockDirectives} = await import(`${packageName}/migrations/block-directives`);

const require = createRequire(import.meta.url);
const cjs = require('@diplodoc/transform/migrations/block-directives');
assert.equal(cjs.migrateBlockDirectives, migrateBlockDirectives);
const owners = [
    [
        'cut',
        '{% cut "Title" %}\n\nBody\n\n{% endcut %}',
        ':::cut [Title]\n\nBody\n\n:::',
        'yfm-cut',
    ],
    [
        'notes',
        '{% note info %}\n\nBody\n\n{% endnote %}',
        ':::note {type=info}\n\nBody\n\n:::',
        'yfm-note',
    ],
    [
        'tabs',
        '{% list tabs %}\n\n- First\n\n  Body\n\n{% endlist %}',
        ':::tabs\n\n- First\n\n  Body\n\n:::',
        'yfm-tabs',
    ],
];
for (const [id, legacy, colon, marker] of owners) {
    for (const source of [legacy, colon]) {
        assert(transform(source, {disableLiquid: true}).result.html.includes(marker));
        assert(browserTransform(source).result.html.includes(marker));
    }

    for (const mode of ['disabled', 'enabled', 'only']) {
        const pluginConfiguration = {
            preset: 'none',
            enable: [id],
            options: {[id]: {directiveSyntax: mode}},
        };
        for (const render of [
            (source) => transform(source, {disableLiquid: true, pluginConfiguration}).result.html,
            (source) => browserTransform(source, {pluginConfiguration}).result.html,
        ]) {
            assert.equal(render(legacy).includes(marker), mode !== 'only');
            assert.equal(render(colon).includes(marker), mode !== 'disabled');
        }
    }
}
const note = (body) => `{% note info %}\n\n${body}\n\n{% endnote %}`;
for (const source of [
    note('Body'),
    '{% cut "Title" %}\n\nBody\n\n{% endcut %}',
    '{% list tabs %}\n\n- First\n\n  Body\n\n{% endlist %}',
]) {
    const result = migrateBlockDirectives(source, {path: 'authored.md'});
    assert.equal(result.edits.length, 2);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(migrateBlockDirectives(result.output).output, result.output);
    assert.equal(
        [...result.edits]
            .reverse()
            .reduce(
                (text, edit) => text.slice(0, edit.start) + edit.replacement + text.slice(edit.end),
                source,
            ),
        result.output,
    );
}
const crossed = `{% cut "Outer" %}\n\n{% note info %}\n\nBody\n\n{% endcut %}\n\n${note('Inside')}\n\n{% endnote %}`;
const partial = migrateBlockDirectives(`${crossed}\n\n${note('Safe')}`, {path: 'authored.md'});
assert(partial.output.startsWith(crossed));
assert(partial.output.includes(':::note {type=info}\n\nSafe'));
assert.equal(partial.edits.length, 2);
assert(partial.diagnostics.length > 0);
for (const item of partial.diagnostics) {
    assert.equal(item.path, 'authored.md');
    assert.equal(typeof item.offset, 'number');
    assert(item.line >= 1 && item.column >= 1);
}
const generated = `{% included (child.md) %}\n\n${note('Cached')}\n\n{% endincluded %}`;
assert.equal(migrateBlockDirectives(generated).output, generated);
const source = `\uFEFF😀\0\r\n\r\n${note('Body').replaceAll('\n', '\r\n')}\r\n`;
const original = migrateBlockDirectives(source);
assert.equal(original.edits.length, 2);
assert(original.output.startsWith('\uFEFF😀\0\r\n\r\n'));
assert.equal(source.slice(original.edits[0].start, original.edits[0].end), '{% note info %}');
process.stdout.write(
    'Installed pure block-directive migration, partial scopes and original offsets passed\n',
);
