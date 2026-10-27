import MarkdownIt from 'markdown-it';

// Utilities also used before a document parser exists (for example, highlighting).
export const {escapeHtml} = new MarkdownIt().utils;
