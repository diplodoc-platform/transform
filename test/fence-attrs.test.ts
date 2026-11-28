import {load} from 'cheerio';
import {describe, expect, it} from 'vitest';

import transform from '../src/transform';
import {parseFenceAttrs} from '../src/transform/plugins/fence-attrs';

describe('markdown-it-attrs on fenced code blocks', () => {
  it('keeps a data attribute on <pre>', () => {
    const source = '```python {data=asdf}\nprint(\'hello\')\n```';
    const pre = load(transform(source, {enableMarkdownAttrs: true}).result.html)(
      'pre',
    );
    expect(pre.attr('data')).toBe('asdf');
    expect(pre.find('code').text()).toContain("print('hello')");
  });

  it('keeps the language and applies class, id and data attributes', () => {
    const source =
      '```python {.my-class #my-id data-x=hello}\nprint(\'hello\')\n```';
    const pre = load(transform(source, {enableMarkdownAttrs: true}).result.html)(
      'pre',
    );
    expect(pre.attr('class')).toContain('my-class');
    expect(pre.attr('id')).toBe('my-id');
    expect(pre.attr('data-x')).toBe('hello');
    expect(pre.find('code').attr('class')).toContain('language-python');
  });

  it('leaves a plain fenced block unchanged', () => {
    const source = '```python\nprint(\'hello\')\n```';
    const pre = load(transform(source, {enableMarkdownAttrs: true}).result.html)(
      'pre',
    );
    expect(pre.attr('data')).toBeUndefined();
    expect(pre.find('code').attr('class')).toContain('language-python');
  });
});

describe('parseFenceAttrs', () => {
  it('splits the language from the attrs group', () => {
    expect(parseFenceAttrs('python {data=asdf}')).toEqual({
      attrs: [{name: 'data', value: 'asdf'}],
      info: 'python',
    });
  });

  it('returns no attrs for a plain fence info string', () => {
    expect(parseFenceAttrs('python')).toEqual({attrs: [], info: 'python'});
  });
});
