module.exports = {
    // Default state for all rules
    default: true,

    'log-levels': {
        MD013: 'disabled', // Line length
        MD038: 'disabled', // Spaces inside code span elements
        MD040: 'disabled', // Fenced code blocks should have a language specified
        MD041: 'disabled', // First line in a file should be a top-level heading
        MD045: 'disabled', // Images should have alternate text (alt text)

        // This rule threw an exception for a paragraph without children
        // There is no check before filtering the children
        MD036: 'disabled', // Emphasis used instead of a heading

        MD018: 'error', // No space after hash on atx style heading
        MD042: 'error', // No empty links
        MD033: 'error', // Inline HTML

        YFM003: 'error', // Link is unreachable
    },

    // Inline code length
    YFM001: {
        maximum: 100,
    },
};
