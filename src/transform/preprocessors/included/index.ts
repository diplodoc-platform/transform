import {getFullIncludePath} from '../../utilsFS';
import {MarkdownItPreprocessorCb} from '../../typings';
import {MarkdownItIncluded} from '../../plugins/includes/types';

const INCLUDE_REGEXP = /^\s*{%\s*included\s*\((.+?)\)\s*%}\s*$/;
const INCLUDE_END_REGEXP = /^\s*{% endincluded %}\s*$/;

const preprocessLine = (
    lines: string[],
    start: number,
    {
        root,
        path,
    }: {
        root?: string;
        path?: string;
    },
    md?: MarkdownItIncluded,
) => {
    const hasIncludedCache = md && root && path;
    const str = lines[start];
    const match = str?.match(INCLUDE_REGEXP);

    // Protect from unmatched results
    if (!match) {
        return false;
    }

    const includePathRelative = match[1];

    // Protect from empty path
    if (!includePathRelative) {
        return false;
    }

    // Read all content from top to bottom(!) char of the included block
    const data = [];
    let line = start;
    while (line < lines.length) {
        line++;
        const str = lines[line];
        if (str === null) {
            break;
        }
        if (str?.match(INCLUDE_END_REGEXP)) {
            break;
        }
        data.push(str);
    }

    // No included cache for lint mode
    if (hasIncludedCache) {
        if (!md.included) {
            md.included = {};
        }

        // Normalize the path to absolute
        const includePath = getFullIncludePath(includePathRelative, root, path);

        // Store the included content
        md.included[includePath] = data.join('\n');
    }

    // Remove the content of the included file
    lines.splice(start, data.length + 2);

    return true;
};

const index: MarkdownItPreprocessorCb<{
    included?: boolean;
}> = (input, options, md?: MarkdownItIncluded) => {
    const {included, path, root} = options;

    // To reduce file reading we can include the file content into the generated content
    if (included) {
        const lines = input?.split('\n') || [];

        // The finction reads the files from bottom to top(!). It stops the loop if it does not have anything to swap.
        // If the function finds something to process then it restarts the loop because the position of the last element has been moved.
        // eslint-disable-next-line no-unmodified-loop-condition
        while (input?.length) {
            let hasChars = false;
            for (let line = lines.length - 1; line >= 0; line--) {
                hasChars = preprocessLine(lines, line, {path, root}, md);
                if (hasChars) {
                    break;
                }
            }
            if (!hasChars) {
                break;
            }
        }

        input = lines.join('\n');
    }

    return input;
};

export = index;
