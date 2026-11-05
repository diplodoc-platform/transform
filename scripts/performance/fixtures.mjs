import assert from 'node:assert/strict';

const repeat = (n, make) => Array.from({length: n}, (_, index) => make(index)).join('\n\n');
const count = (source, expression) => [...source.matchAll(expression)].length;
const htmlCount = (expression, expected) => (output) =>
    assert.equal(count(output.html, expression), expected);
const verifyFragmentIDs = (html, expectedIDs, expectedLinks) => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const links = [...html.matchAll(/\shref="#([^"]+)"/g)].map((match) => match[1]);
    const uniqueIDs = new Set(ids);
    assert.equal(uniqueIDs.size, ids.length, 'DOM IDs must be unique within a document');
    if (expectedIDs !== undefined) {
        assert.equal(ids.length, expectedIDs);
    }
    if (expectedLinks !== undefined) {
        assert.equal(links.length, expectedLinks);
    }
    for (const target of links) {
        assert.ok(uniqueIDs.has(target), `Missing fragment target ${target}`);
    }
};
const note = (index) => `{% note info %}\n\nNote ${index}.\n\n{% endnote %}`;

/** Public API workloads. Sizes describe repeated units, except adversarial whitespace lengths. */
export const cases = {
    'normal-doc': {
        sizes: [12, 24],
        source: (n) =>
            repeat(
                n,
                (i) =>
                    `## Deployment step ${i}\n\nRead the [guide](https://example.org/guide) and **check** the service.\n\n- Configure the endpoint\n- Verify the response\n\n\`\`\`json\n{"enabled":true}\n\`\`\`\n\n| Setting | Value |\n| --- | --- |\n| enabled | true |`,
            ),
        verify: (output, n) => {
            htmlCount(/<h2\b/g, n)(output);
            htmlCount(/<table\b/g, n)(output);
            assert.ok(output.html.includes('Deployment step'));
            verifyFragmentIDs(output.html);
        },
    },
    headings: {
        sizes: [400, 800],
        source: (n) => repeat(n, (i) => `## API method ${i}\n\nDescription ${i}.`),
        verify: (output, n) => {
            htmlCount(/<h2\b/g, n)(output);
            verifyFragmentIDs(output.html, n, n);
        },
    },
    tables: {
        sizes: [80, 160],
        source: (n) => repeat(n, (i) => `#|\n|| Name ${i} | Value ||\n|| \`a|b\` | Result ||\n|#`),
        verify: (output, n) => {
            htmlCount(/<table\b/g, n)(output);
            assert.ok(output.html.includes('a|b</code>'));
        },
    },
    'table-rows-plain': {
        sizes: [400, 800],
        source: (n) => '#|\n' + '|| ordinary text | other text ||\n'.repeat(n) + '|#',
        verify: (output, n) => {
            htmlCount(/<table\b/g, 1)(output);
            htmlCount(/<td\b/g, n * 2)(output);
        },
    },
    'table-rows-inline': {
        sizes: [400, 800],
        source: (n) => '#|\n' + '|| `ordinary|text` | other text ||\n'.repeat(n) + '|#',
        verify: (output, n) => {
            htmlCount(/<table\b/g, 1)(output);
            htmlCount(/<td\b/g, n * 2)(output);
            htmlCount(/ordinary\|text/g, n)(output);
        },
    },
    'table-rows-multiline': {
        sizes: [400, 800],
        source: (n) => '#|\n' + '|| `ordinary\ntext|inside` | other text ||\n'.repeat(n) + '|#',
        verify: (output, n) => {
            htmlCount(/<table\b/g, 1)(output);
            htmlCount(/<td\b/g, n * 2)(output);
            htmlCount(/ordinary text\|inside/g, n)(output);
        },
    },
    'table-unmatched-following': {
        sizes: [4000, 8000],
        source: (n) => '#|\n|| Press ` key | text ||\n|#\n\n' + 'plain text\n'.repeat(n),
        verify: (output, n) => {
            htmlCount(/<table\b/g, 1)(output);
            htmlCount(/<td\b/g, 2)(output);
            htmlCount(/plain text/g, n)(output);
        },
    },
    includes: {
        includes: true,
        sizes: [40, 80],
        source: (n) => repeat(n, () => '{% include [setup](./snippet.md) %}'),
        files: {'snippet.md': 'Included **setup instructions**.\n'},
        verify: (output, n) => htmlCount(/setup instructions/g, n)(output),
    },
    'directive-accepted': {
        sizes: [30, 60],
        migration: 'block-directives',
        source: (n) => repeat(n, note),
        verify: (output, n) => {
            assert.equal(output.diagnostics.length, 0);
            assert.equal(output.edits.length, n * 2);
            assert.equal(count(output.output, /:::note/g), n);
        },
    },
    'directive-rejected': {
        sizes: [30, 60],
        migration: 'block-directives',
        source: (n) =>
            repeat(n, (i) => `{% included (child-${i}.md) %}\n\n${note(i)}\n\n{% endincluded %}`),
        verify: (output, n, source) => {
            assert.equal(output.output, source);
            assert.equal(output.edits.length, 0);
            assert.ok(output.diagnostics.length >= n);
        },
    },
    'image-candidates': {
        sizes: [80, 160],
        migration: 'image-dimensions',
        source: (n) => repeat(n, (i) => `Paragraph ${i} ![Diagram ${i}](image-${i}.png =100x200)`),
        verify: (output, n) => {
            assert.equal(output.diagnostics.length, 0);
            assert.equal(output.edits.length, n * 2);
            assert.equal(count(output.output, /width=100/g), n);
        },
    },
    'table-migration': {
        sizes: [30, 60],
        migration: 'table-alignment',
        source: (n) => repeat(n, (i) => `#|\n|| Value ${i} {.cell-align-center} ||\n|#`),
        verify: (output, n) => {
            assert.equal(output.diagnostics.length, 0);
            assert.ok(output.edits.length >= n);
            assert.equal(count(output.output, /\.cell-align-center/g), 0);
        },
    },
    footnotes: {
        sizes: [2000, 4000],
        source: (n) =>
            repeat(n, (i) => `Paragraph ${i}[^f${i}] and[^f${i}].\n\n[^f${i}]: Note ${i}.`),
        verify: (output, n) => {
            htmlCount(/class="footnote-item"/g, n)(output);
            verifyFragmentIDs(output.html, n * 3, n * 4);
        },
    },
    'browser-malformed-html': {
        sizes: [200, 400],
        browser: true,
        source: (n) =>
            repeat(
                n,
                () =>
                    '<div><p>Visible<table><tr><td>cell</div><script>alert(1)</script><img src="x" onerror="alert(1)">',
            ),
        verify: (output, n) => {
            assert.equal(count(output.html, /Visible/g), n);
            assert.doesNotMatch(output.html, /<script|onerror\s*=/i);
        },
    },
    'include-adversarial': {
        includes: true,
        sizes: [8000, 16000],
        source: (n) => '{%include' + ' '.repeat(n) + 'x',
        verify: (output) => assert.ok(output.html.includes('{%include')),
    },
    'table-adversarial': {
        sizes: [8000, 16000],
        source: (n) => '#|\n|| ' + ' '.repeat(n) + 'x ||\n|#',
        verify: (output) => {
            htmlCount(/<table\b/g, 1)(output);
            assert.ok(output.html.includes('x'));
        },
    },
    'sanitize-adversarial': {
        sizes: [8000, 16000],
        sanitize: true,
        source: (n) =>
            `<span style="background:url(${' '.repeat(n)}x);color:red">Visible</span><span style="background:url(javascript:alert(1))">Unsafe</span><span style="background:url(data:text/html,evil);width:expression(alert(1));behavior:url(evil);-moz-binding:url(evil)">Other</span><script>alert(1)</script>`,
        verify: (output) => {
            assert.ok(output.html.includes('Visible'));
            assert.ok(output.html.includes('Unsafe'));
            assert.doesNotMatch(
                output.html,
                /javascript:|data:text\/html|expression\s*\(|behavior\s*:|-moz-binding|<script|onerror\s*=/i,
            );
        },
    },
    'document-log-history': {
        sizes: [250, 500],
        batchRoots: true,
        source: (n) =>
            JSON.stringify(
                Array.from({length: n}, (_, i) => ({
                    path: `/performance/document-${i}.md`,
                    source: 'Text',
                })),
                null,
                2,
            ),
        verify: (output, n, _source, {hasRoleOracle = false} = {}) => {
            assert.equal(output.html, '<p>Text</p>\n');
            assert.equal(output.atReturnWarnCounts.length, n);
            const documentScoped =
                output.atReturnWarnCounts.every((value) => value === 1) &&
                output.retainedFirstWarn.length === 1 &&
                output.globalWarn.length === 0;
            if (!hasRoleOracle || documentScoped)
                assert.ok(documentScoped, 'Expected fresh document diagnostics');
            else {
                assert.deepEqual(
                    output.atReturnWarnCounts,
                    Array.from({length: n}, (_, i) => i + 1),
                );
                assert.equal(output.retainedFirstWarn.length, n);
                assert.deepEqual(output.globalWarn, output.retainedFirstWarn);
            }
            for (const warning of output.retainedFirstWarn)
                assert.ok(warning.includes('TRANSFORM_BUNDLED_LIQUID'));
        },
    },
    'scanner-opaque-tables': {
        sizes: [40, 80],
        document: true,
        source: (n) =>
            repeat(n, (i) => `:::note {type=info}\n\n#|\n|| Cell ${i} | Other ||\n|#\n\n:::`),
        verify: (output, n) => {
            htmlCount(/<table\b/g, n)(output);
            htmlCount(/<td\b/g, n * 2)(output);
            htmlCount(/class="[^"]*\byfm-note(?:\s|")/g, n)(output);
            assert.ok(!output.html.includes(':::note'));
            assert.ok(Array.isArray(output.tokens));
        },
    },
    'block-scope-prefix': {
        sizes: [128, 256],
        migration: 'block-directives',
        source: (n) =>
            repeat(n, () => ':::note {type=info}\n\nExisting\n\n:::') + '\n\n' + note('final'),
        verify: (output, _n, source) => {
            assert.equal(output.edits.length, 2);
            assert.deepEqual(output.diagnostics, []);
            assert.equal(
                output.output,
                source
                    .replace('{% note info %}', ':::note {type=info}')
                    .replace('{% endnote %}', ':::'),
            );
        },
    },
    'block-unproved-markers': {
        sizes: [128, 256],
        migration: 'block-directives',
        source: (n) => repeat(n, note) + '\n\n' + repeat(n, () => ':::custom'),
        verify: (output, n, source) => {
            assert.equal(output.edits.length, n * 2);
            assert.equal(
                output.output,
                source
                    .replaceAll('{% note info %}', ':::note {type=info}')
                    .replaceAll('{% endnote %}', ':::'),
            );
            assert.deepEqual(
                output.diagnostics.map((item) => item.reason),
                Array(n).fill('unproved-colon-scope'),
            );
            assert.deepEqual(
                output.diagnostics.map((item) => item.offset),
                [...source.matchAll(/^:::custom$/gm)].map((match) => match.index),
            );
        },
    },
    'block-real-fallback': {
        sizes: [32, 64],
        migration: 'block-directives',
        source: (n) =>
            repeat(n, () => '- prefix\n\n  {% cut "Title" %}\n  \n  Body\n  \n  {% endcut %}'),
        verify: (output, n, source) => {
            assert.equal(output.output, source);
            assert.deepEqual(output.edits, []);
            assert.equal(output.diagnostics.length, n);
            for (const item of output.diagnostics) {
                assert.ok(
                    ['equivalence-check-failed', 'equivalence-budget-exceeded'].includes(
                        item.reason,
                    ),
                );
                assert.ok(source.slice(item.offset).startsWith('{% cut'));
                assert.ok(item.line > 0 && item.column > 0);
            }
        },
    },
    'image-complex-budget': {
        sizes: [32, 64],
        migration: 'image-dimensions',
        migrationOptions: {path: 'budget.md'},
        source: (n) => repeat(n, (i) => `- Item ${i} ![a](a =20x30)`) + '\n\nRoot ![b](b =40x50)',
        verify: (output, n, source, {hasRoleOracle = false} = {}) => {
            const historical =
                hasRoleOracle &&
                output.diagnostics.length === 0 &&
                output.edits.length === (n + 1) * 2;
            const accepted = historical ? n : Math.min(n, 8);
            assert.equal(output.edits.length, (accepted + 1) * 2);
            assert.equal(output.diagnostics.length, n - accepted);
            let index = 0;
            const expected = source
                .replace(/!\[a]\(a =20x30\)/g, (raw) =>
                    index++ < accepted ? '![a](a){width=20 height=30}' : raw,
                )
                .replace('![b](b =40x50)', '![b](b){width=40 height=50}');
            assert.equal(output.output, expected);
            assert.deepEqual(
                output.diagnostics.map((item) => item.offset),
                [...source.matchAll(/[=]20x30/g)].slice(accepted).map((match) => match.index),
            );
            for (const item of output.diagnostics) {
                assert.equal(item.reason, 'equivalence-budget-exceeded');
                assert.equal(item.path, 'budget.md');
                assert.ok(item.line > 0 && item.column > 0);
            }
        },
    },
    'browser-malformed-tag-suffix': {
        sizes: [2000, 4000],
        browser: true,
        browserOptions: {allowHTML: false},
        source: (n) => 'text <a '.repeat(n),
        verify: (output, n) => {
            assert.equal(count(output.html, /text/g), n);
            assert.ok(!output.html.includes('<a '));
        },
    },
    'browser-quoted-include-ranges': {
        sizes: [128, 256],
        browser: true,
        browserOptions: {allowHTML: false},
        source: (n) => '<a data="\n{% included (child.md) %}\n">x</a>\n\n'.repeat(n),
        verify: (output, n) => assert.equal(count(output.html, /included/g), n),
    },
};
