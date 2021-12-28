module.exports = {
    // Default state for all rules
    default: true,

    'log-levels': {
        MD001: 'disabled', // Heading levels should only increment by one level at a time
        MD002: 'disabled', // First heading should be a top-level heading~~
        MD003: 'disabled', // Heading style
        MD004: 'disabled', // Unordered list style
        MD005: 'disabled', // Inconsistent indentation for list items at the same level
        MD006: 'disabled', // Consider starting bulleted lists at the beginning of the line~~
        MD007: 'disabled', // Unordered list indentation
        MD009: 'disabled', // Trailing spaces
        MD010: 'disabled', // Hard tabs
        MD011: 'disabled', // Reversed link syntax
        MD012: 'disabled', // Multiple consecutive blank lines
        MD013: 'disabled', // Line length
        MD014: 'disabled', // Dollar signs used before commands without showing output
        MD018: 'disabled', // No space after hash on atx style heading
        MD019: 'disabled', // Multiple spaces after hash on atx style heading
        MD020: 'disabled', // No space inside hashes on closed atx style heading
        MD021: 'disabled', // Multiple spaces inside hashes on closed atx style heading
        MD022: 'disabled', // Headings should be surrounded by blank lines
        MD023: 'disabled', // Headings must start at the beginning of the line
        MD024: 'disabled', // Multiple headings with the same content
        MD025: 'disabled', // Multiple top-level headings in the same document
        MD026: 'disabled', // Trailing punctuation in heading
        MD027: 'disabled', // Multiple spaces after blockquote symbol
        MD028: 'disabled', // Blank line inside blockquote
        MD029: 'disabled', // Ordered list item prefix
        MD030: 'disabled', // Spaces after list markers
        MD031: 'disabled', // Fenced code blocks should be surrounded by blank lines
        MD032: 'disabled', // Lists should be surrounded by blank lines
        MD033: 'disabled', // Inline HTML
        MD034: 'disabled', // Bare URL used
        MD035: 'disabled', // Horizontal rule style
        MD036: 'disabled', // Emphasis used instead of a heading
        MD037: 'disabled', // Spaces inside emphasis markers
        MD038: 'disabled', // Spaces inside code span elements
        MD039: 'disabled', // Spaces inside link text
        MD040: 'disabled', // Fenced code blocks should have a language specified
        MD041: 'disabled', // First line in a file should be a top-level heading
        MD042: 'disabled', // No empty links
        MD043: 'disabled', // Required heading structure
        MD044: 'disabled', // Proper names should have the correct capitalization
        MD045: 'disabled', // Images should have alternate text (alt text)
        MD046: 'disabled', // Code block style
        MD047: 'disabled', // Files should end with a single newline character
        MD048: 'disabled', // Code fence style

        YFM001: 'warn', // Inline code length
        YFM002: 'warn', // No header found in the file for the link text
        YFM003: 'error', // Link is unreachable
        YFM004: 'error', // Table not closed
        YFM005: 'error', // Tab list not closed
    },

    // Inline code length
    YFM001: {
        maximum: 100,
    },
};
