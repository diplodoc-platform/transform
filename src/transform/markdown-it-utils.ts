import MarkdownIt from './markdown-it-runtime';

// Utilities also used before a document parser exists (for example, highlighting).
export const {escapeHtml} = new MarkdownIt().utils;
