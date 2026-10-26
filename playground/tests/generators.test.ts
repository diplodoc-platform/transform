import assert from 'node:assert/strict';
import {test} from 'vitest';

import {generateHTML, generateMD, generateTokens} from '../src/SplitViewEditor/generators';

const table = '#|\n||::{bg="red" align="center"} Новый синтаксис ||\n|#';

test('HTML preview recognizes YFM table cell attributes', () => {
    const html = generateHTML(table);
    assert.match(html, /class="[^"]*cell-align-center/);
    assert.match(html, /class="[^"]*cell-bg-red/);
    assert.doesNotMatch(html, /::\{/);
    assert.match(html, /Новый синтаксис/);
});

test('token output preserves YFM table cell attributes', () => {
    const tokens = JSON.parse(generateTokens(table));
    const cell = tokens.find((token) => token.type === 'yfm_td_open');
    assert.ok(cell, 'table cell token is present');
    assert.ok(cell.attrs?.some(([name, value]) => name === 'data-bg' && value === 'red'));
});

test('HTML and Markdown output keep ordinary content', () => {
    const source = '# Заголовок\n\n**Текст**';
    assert.match(generateHTML(source), /<strong>Текст<\/strong>/);
    assert.match(generateMD(source), /\*\*Текст\*\*/);
});

test('Markdown output preserves table attributes when rendered again', () => {
    const html = generateHTML(generateMD(table));
    assert.match(html, /class="[^"]*cell-align-center/);
    assert.match(html, /class="[^"]*cell-bg-red/);
});
