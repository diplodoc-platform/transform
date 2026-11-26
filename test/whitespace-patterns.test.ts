import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';

import {browserCss} from '../src/transform/browser/css';
import {createIncludeRegExp} from '../src/transform/plugins/includes/syntax';
import {sanitizeStyles} from '../src/transform/sanitize';
import {createSanitizer, defaultOptions} from '../src/transform/sanitize-core';

// Frozen compatibility oracles, intentionally retaining the old backtracking behavior.
const oldInclude = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;
const oldDangerousUrl =
    /url\s*\(\s*['"]?\s*(?:javascript:|vbscript:|data\s*:\s*(?:text\/html|application\/xhtml\+xml|image\/svg\+xml))/i;

const whitespace = ['', ' ', '  ', '\t', '\r\n', '\f', '\v', '\u00a0', '\ufeff'];

function dangerousUrlPattern(): RegExp {
    // Read the private production expression without adding a public sanitizer API for tests.
    const source = ts.createSourceFile(
        'sanitize-core.ts',
        readFileSync(join(__dirname, '../src/transform/sanitize-core.ts'), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
    );
    let literal: string | undefined;
    const visit = (node: ts.Node) => {
        if (
            ts.isVariableDeclaration(node) &&
            node.name.getText(source) === 'DANGEROUS_URL_RE' &&
            node.initializer &&
            ts.isRegularExpressionLiteral(node.initializer)
        ) {
            literal = node.initializer.getText(source);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    if (!literal) throw new Error('Missing production dangerous URL expression');
    const end = literal.lastIndexOf('/');
    return new RegExp(literal.slice(1, end), literal.slice(end + 1));
}

describe('Whitespace pattern compatibility', () => {
    it('preserves include captures and rejection across optional notitle and whitespace', () => {
        const pattern = createIncludeRegExp();
        expect(pattern.flags).toBe(oldInclude.flags);
        expect(createIncludeRegExp()).not.toBe(pattern);

        for (const before of whitespace) {
            for (const after of whitespace) {
                for (const option of ['', 'notitle', 'notitlex', 'NOTITLE']) {
                    for (const body of [
                        '[title](path.md)',
                        '[](path)',
                        '[a](b)(c)',
                        '[x] (y)',
                        '[x](y)z',
                        '[a\nb](c)',
                    ]) {
                        const input = `{%${before}include${before}${option}${after}${body}${after}%}`;
                        expect(pattern.exec(input), input).toEqual(oldInclude.exec(input));
                    }
                }
            }
        }
    });

    it('preserves dangerous CSS URL recognition including unmatched quotes', () => {
        const pattern = dangerousUrlPattern();
        expect(pattern.flags).toBe(oldDangerousUrl.flags);
        const schemes = [
            // eslint-disable-next-line no-script-url -- Deliberately unsafe sanitizer test input.
            'javascript:alert(1)',
            // eslint-disable-next-line no-script-url -- Case-insensitive unsafe scheme recognition.
            'JaVaScRiPt:alert(1)',
            'vbscript:x',
            'data:text/html,x',
            'data : application/xhtml+xml,x',
            'data\t:\nimage/svg+xml,x',
            'https://example.com/a.svg',
            'data:image/png,x',
            'javascript :x',
            'java\nscript:x',
        ];

        for (const before of whitespace) {
            for (const after of whitespace) {
                for (const quote of ['', "'", '"', "''", '\'"']) {
                    for (const scheme of schemes) {
                        const input = `prefix URL${before}(${before}${quote}${after}${scheme}) suffix`;
                        expect(pattern.exec(input), input).toEqual(oldDangerousUrl.exec(input));
                    }
                }
            }
        }
    });

    const browser = createSanitizer(browserCss, {info: () => {}});
    for (const [host, sanitize] of [
        ['node', sanitizeStyles],
        ['browser', browser.sanitizeStyles],
    ] as const) {
        it(`${host} still removes unsafe styles and retains ordinary URLs`, () => {
            const options = {...defaultOptions, cssWhiteList: {'background-image': true}};
            for (const value of [
                'url( javascript:alert(1))',
                'url( "  vbscript:evil")',
                "url( ' data:text/html,evil')",
                'url(data:image/svg+xml,evil)',
                'url(\\6a avascript:alert(1))',
            ]) {
                const result = sanitize(
                    `<style>.test {background-image:${value}}</style>`,
                    options,
                );
                expect(result, value).not.toContain('background-image');
            }
            const safe = sanitize(
                '<style>.test {background-image:url( " https://example.com/a.png")}</style>',
                options,
            );
            expect(safe).toContain('background-image');
            expect(safe).toContain('https://example.com/a.png');
        });
    }
});
