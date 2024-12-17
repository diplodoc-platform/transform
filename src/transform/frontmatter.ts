import {YAMLException, dump, load} from 'js-yaml';
import {dedent} from 'ts-dedent';
import cloneDeepWith from 'lodash/cloneDeepWith';

import {log} from './log';

export type FrontMatter = {
    [key: string]: unknown;
    metadata?: Record<string, unknown>[];
};

const SEP = '---';

/**
 * Temporary workaround to enable parsing YAML metadata from potentially
 * Liquid-aware source files
 * @param content Input string which could contain Liquid-style substitution syntax (which clashes with YAML
 * object syntax)
 * @returns String with `{}` escaped, ready to be parsed with `js-yaml`
 */
const escapeLiquid = (content: string): string =>
    content.replace(/{{/g, '(({{').replace(/}}/g, '}}))');

/**
 * Inverse of a workaround defined above.
 * @see `escapeLiquidSubstitutionSyntax`
 * @param escapedContent Input string with `{}` escaped with backslashes
 * @returns Unescaped string
 */
const unescapeLiquid = (escapedContent: string): string =>
    escapedContent.replace(/\(\({{/g, '{{').replace(/}}\)\)/g, '}}');

const matchMetadata = (fileContent: string) => {
    if (!fileContent.startsWith(SEP)) {
        return null;
    }

    const closeStart = fileContent.indexOf('\n' + SEP, SEP.length);
    const closeEnd = fileContent.indexOf('\n', closeStart + 1);

    if (closeStart === -1) {
        return null;
    }

    return [fileContent.slice(SEP.length, closeStart).trim(), fileContent.slice(closeEnd + 1)];
};

const duplicateKeysCompatibleLoad = (yaml: string, filePath: string | undefined) => {
    try {
        return load(yaml);
    } catch (e) {
        if (e instanceof YAMLException) {
            const duplicateKeysDeprecationWarning = dedent`
                In ${filePath ?? '(unknown)'}: Encountered a YAML parsing exception when processing file metadata: ${e.reason}.
                It's highly possible the input file contains duplicate mapping keys.
                Will retry processing with necessary compatibility flags.
                Please note that this behaviour is DEPRECATED and WILL be removed in a future version
                without further notice, so the build WILL fail when supplied with YAML-incompatible meta.
            `;

            log.warn(duplicateKeysDeprecationWarning);

            return load(yaml, {json: true});
        }

        throw e;
    }
};

export const extractFrontMatter = (
    fileContent: string,
    filePath?: string,
): [FrontMatter, string] => {
    const matches = matchMetadata(fileContent);

    if (matches) {
        const [metadata, strippedContent] = matches;

        return [
            cloneDeepWith(
                duplicateKeysCompatibleLoad(escapeLiquid(metadata), filePath) as FrontMatter,
                (v) => (typeof v === 'string' ? unescapeLiquid(v) : undefined),
            ),
            strippedContent,
        ];
    }

    return [{}, fileContent];
};

export const composeFrontMatter = (frontMatter: FrontMatter, strippedContent: string) => {
    const dumped = dump(frontMatter, {lineWidth: -1}).trim();

    // This empty object check is a bit naive
    // The other option would be to check if all own fields are `undefined`,
    // since we exploit passing in `undefined` to remove a field quite a bit
    if (dumped === '{}') {
        return strippedContent;
    }

    return `${SEP}\n${dumped}\n${SEP}\n${strippedContent}`;
};
