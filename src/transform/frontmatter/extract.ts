import {YAMLException, load} from 'js-yaml';

import {log} from '../log';

import {
    FrontMatter,
    countLineAmount,
    escapeLiquidSubstitutionSyntax,
    frontMatterFence,
    unescapeLiquidSubstitutionSyntax,
} from './common';
import {transformFrontMatterValues} from './transformValues';

type ParseExistingMetadataReturn = {
    frontMatter: FrontMatter;
    frontMatterStrippedContent: string;
    frontMatterLineCount: number;
};

const matchMetadata = (fileContent: string) => {
    if (!fileContent.startsWith(frontMatterFence)) {
        return null;
    }

    // Search by format:
    // ---
    // metaName1: metaValue1
    // metaName2: meta value2
    // incorrectMetadata
    // ---
    const regexpMetadata = '(?<=-{3}\\r?\\n)((.*\\r?\\n)*?)(?=-{3}\\r?\\n)';
    // Search by format:
    // ---
    // main content 123
    const regexpFileContent = '-{3}\\r?\\n((.*[\r?\n]*)*)';

    const regexpParseFileContent = new RegExp(`${regexpMetadata}${regexpFileContent}`, 'gm');

    return regexpParseFileContent.exec(fileContent);
};

const duplicateKeysCompatibleLoad = (yaml: string, filePath: string | undefined) => {
    try {
        return load(yaml);
    } catch (e) {
        if (e instanceof YAMLException) {
            const duplicateKeysDeprecationWarning = `
                In ${filePath ?? '(unknown)'}: Encountered a YAML parsing exception when processing file metadata: ${e.reason}.
                It's highly possible the input file contains duplicate mapping keys.
                Will retry processing with necessary compatibility flags.
                Please note that this behaviour is DEPRECATED and WILL be removed in a future version
                without further notice, so the build WILL fail when supplied with YAML-incompatible meta.
            `
                .replace(/^\s+/gm, '')
                .replace(/\n/g, ' ')
                .trim();

            log.warn(duplicateKeysDeprecationWarning);

            return load(yaml, {json: true});
        }

        throw e;
    }
};

export const separateAndExtractFrontMatter = (
    fileContent: string,
    filePath?: string,
): ParseExistingMetadataReturn => {
    const matches = matchMetadata(fileContent);

    if (matches && matches.length > 0) {
        const [, metadata, , metadataStrippedContent] = matches;

        return {
            frontMatter: transformFrontMatterValues(
                duplicateKeysCompatibleLoad(
                    escapeLiquidSubstitutionSyntax(metadata),
                    filePath,
                ) as FrontMatter,
                (v) => (typeof v === 'string' ? unescapeLiquidSubstitutionSyntax(v) : v),
            ),
            frontMatterStrippedContent: metadataStrippedContent,
            frontMatterLineCount: countLineAmount(metadata),
        };
    }

    return {
        frontMatter: {},
        frontMatterStrippedContent: fileContent,
        frontMatterLineCount: 0,
    };
};
