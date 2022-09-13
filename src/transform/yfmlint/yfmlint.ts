import {LintConfig} from '.';
import {LogLevels} from '../log';

const index: LintConfig = {
    // Default state for all rules
    default: true,

    'log-levels': {
        MD001: LogLevels.DISABLED, // Heading levels should only increment by one level at a time
        MD002: LogLevels.DISABLED, // First heading should be a top-level heading~~
        MD003: LogLevels.DISABLED, // Heading style
        MD004: LogLevels.DISABLED, // Unordered list style
        MD005: LogLevels.DISABLED, // Inconsistent indentation for list items at the same level
        MD006: LogLevels.DISABLED, // Consider starting bulleted lists at the beginning of the line~~
        MD007: LogLevels.DISABLED, // Unordered list indentation
        MD009: LogLevels.DISABLED, // Trailing spaces
        MD010: LogLevels.DISABLED, // Hard tabs
        MD011: LogLevels.DISABLED, // Reversed link syntax
        MD012: LogLevels.DISABLED, // Multiple consecutive blank lines
        MD013: LogLevels.DISABLED, // Line length
        MD014: LogLevels.DISABLED, // Dollar signs used before commands without showing output
        MD018: LogLevels.DISABLED, // No space after hash on atx style heading
        MD019: LogLevels.DISABLED, // Multiple spaces after hash on atx style heading
        MD020: LogLevels.DISABLED, // No space inside hashes on closed atx style heading
        MD021: LogLevels.DISABLED, // Multiple spaces inside hashes on closed atx style heading
        MD022: LogLevels.DISABLED, // Headings should be surrounded by blank lines
        MD023: LogLevels.DISABLED, // Headings must start at the beginning of the line
        MD024: LogLevels.DISABLED, // Multiple headings with the same content
        MD025: LogLevels.DISABLED, // Multiple top-level headings in the same document
        MD026: LogLevels.DISABLED, // Trailing punctuation in heading
        MD027: LogLevels.DISABLED, // Multiple spaces after blockquote symbol
        MD028: LogLevels.DISABLED, // Blank line inside blockquote
        MD029: LogLevels.DISABLED, // Ordered list item prefix
        MD030: LogLevels.DISABLED, // Spaces after list markers
        MD031: LogLevels.DISABLED, // Fenced code blocks should be surrounded by blank lines
        MD032: LogLevels.DISABLED, // Lists should be surrounded by blank lines
        MD033: LogLevels.DISABLED, // Inline HTML
        MD034: LogLevels.DISABLED, // Bare URL used
        MD035: LogLevels.DISABLED, // Horizontal rule style
        MD036: LogLevels.DISABLED, // Emphasis used instead of a heading
        MD037: LogLevels.DISABLED, // Spaces inside emphasis markers
        MD038: LogLevels.DISABLED, // Spaces inside code span elements
        MD039: LogLevels.DISABLED, // Spaces inside link text
        MD040: LogLevels.DISABLED, // Fenced code blocks should have a language specified
        MD041: LogLevels.DISABLED, // First line in a file should be a top-level heading
        MD042: LogLevels.DISABLED, // No empty links
        MD043: LogLevels.DISABLED, // Required heading structure
        MD044: LogLevels.DISABLED, // Proper names should have the correct capitalization
        MD045: LogLevels.DISABLED, // Images should have alternate text (alt text)
        MD046: LogLevels.DISABLED, // Code block style
        MD047: LogLevels.DISABLED, // Files should end with a single newline character
        MD048: LogLevels.DISABLED, // Code fence style
        MD049: LogLevels.DISABLED, // Emphasis style should be consistent
        MD050: LogLevels.DISABLED, // Strong style should be consistent

        YFM001: LogLevels.WARN, // Inline code length
        YFM002: LogLevels.WARN, // No header found in the file for the link text
        YFM003: LogLevels.ERROR, // Link is unreachable
        YFM004: LogLevels.ERROR, // Table not closed
        YFM005: LogLevels.ERROR, // Tab list not closed
        YFM006: LogLevels.WARN, // Term definition duplicated
        YFM007: LogLevels.WARN, // Term used without definition
        YFM008: LogLevels.WARN, // Term inside definition not allowed
    },

    // Inline code length
    YFM001: {
        maximum: 100,
    },
};

export = index;
