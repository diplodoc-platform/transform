import type {MarkdownItPluginCb, StateCore} from '../typings';
import {escapeHtml} from '../markdown-it-utils';

/**
 * markdown-it-attrs syntax for fenced code blocks (#124).
 *
 * `markdown-it-attrs` handles attributes on most blocks, but it ignores
 * them on fenced code blocks: for ```python {data=asdf} the attrs never
 * reach the rendered `<pre>`. This plugin extracts the `{...}` group
 * from the fence info string, stores it on the fence token and renders it
 * on the `<pre>` element, so the language stays `python` and the attrs
 * are no longer dropped. Classes (`.foo`), ids (`#bar`) and `key=value`
 * pairs (including quoted values) are supported, as in markdown-it-attrs.
 */
export interface FenceAttr {
  name: string;
  value: string;
}

export function parseFenceAttrs(info: string): {
  info: string;
  attrs: FenceAttr[];
} {
  const match = info.match(/\{([^{}]*)\}/);
  if (!match) return {attrs: [], info};
  const raw = match[1] ?? '';
  const classes: string[] = [];
  const attrs: FenceAttr[] = [];
  const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  for (const part of parts) {
    if (part.startsWith('.')) {
      const className = part.slice(1);
      if (className) classes.push(className);
    } else if (part.startsWith('#')) {
      const id = part.slice(1);
      if (id) attrs.push({name: 'id', value: id});
    } else if (part.includes('=')) {
      const equals = part.indexOf('=');
      const name = part.slice(0, equals);
      let value = part.slice(equals + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (name) attrs.push({name, value});
    }
  }
  if (classes.length) {
    attrs.unshift({name: 'class', value: classes.join(' ')});
  }
  const cleaned = info.replace(match[0], '').replace(/\s+/g, ' ').trim();
  return {attrs, info: cleaned};
}

function injectPreAttrs(html: string, attrs: readonly FenceAttr[]): string {
  return html.replace(/<pre([^>]*)>/, (match, existingAttrs: string) => {
    const classAttr = attrs.find((attr) => attr.name === 'class');
    const classMatch = existingAttrs.match(/class="([^"]*)"/);
    if (classAttr && classMatch) {
      const merged = `${classMatch[1]} ${escapeHtml(classAttr.value)}`;
      const rest = attrs
        .filter((attr) => attr.name !== 'class')
        .map((attr) => ` ${attr.name}="${escapeHtml(attr.value)}"`)
        .join('');
      return `<pre${existingAttrs.replace(
        /class="[^"]*"/,
        `class="${merged}"`,
      )}${rest}>`;
    }
    const attrString = attrs
      .map((attr) => ` ${attr.name}="${escapeHtml(attr.value)}"`)
      .join('');
    return `<pre${existingAttrs}${attrString}>`;
  });
}

export const fenceAttrs: MarkdownItPluginCb = (md) => {
  md.core.ruler.after('block', 'fenceAttrs', (state: StateCore) => {
    for (const token of state.tokens) {
      if (token.type !== 'fence') continue;
      const {attrs, info} = parseFenceAttrs(token.info);
      if (!attrs.length) continue;
      token.info = info;
      for (const attr of attrs) {
        if (attr.name === 'class') {
          const existing = token.attrGet('class');
          token.attrSet(
            'class',
            existing ? `${existing} ${attr.value}` : attr.value,
          );
        } else {
          token.attrSet(attr.name, attr.value);
        }
      }
    }
  });

  const superFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token) return '';
    // The attrs live on the token (set by the core rule above). Keep them
    // off the wrapped renderer so they do not also land on `<code>`;
    // they belong on `<pre>`.
    const attrs = token.attrs
      ? token.attrs.map(([name, value]) => ({name, value}))
      : [];
    const originalAttrs = token.attrs;
    if (attrs.length) token.attrs = null;
    const html = superFence
      ? superFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
    token.attrs = originalAttrs;
    if (!attrs.length || !html) return html;
    return injectPreAttrs(html, attrs);
  };
};
