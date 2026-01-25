import type {Dictionary} from 'lodash';
import type {LintError} from 'markdownlint';
import type {LogLevels} from '../log';

export function errorToString(path: string, error: LintError, sourceMap?: Dictionary<string>) {
    // Use forward slash for rule moniker separator for cross-platform compatibility
    // Rule names like 'YFM001/inline-code-length' should use '/' not platform-specific separator
    const ruleMoniker = error.ruleNames
        ? error.ruleNames.join('/')
        : // @ts-expect-error bad markdownlint typings
          error.ruleName + '/' + error.ruleAlias;
    const lineNumber = sourceMap ? sourceMap[error.lineNumber] : error.lineNumber;

    return (
        `${path}${lineNumber ? `: ${lineNumber}:` : ':'} ${ruleMoniker} ${error.ruleDescription}` +
        (error.errorDetail ? ` [${error.errorDetail}]` : '') +
        (error.errorContext ? ` [Context: "${error.errorContext}"]` : '')
    );
}

export function getLogLevel(opts: {
    ruleNames: string[];
    logLevelsConfig: Record<string, LogLevels>;
    defaultLevel: LogLevels;
}) {
    const {ruleNames, logLevelsConfig, defaultLevel} = opts;
    const ruleName = ruleNames.filter(
        (ruleName) => ruleName in logLevelsConfig,
    )[0] as keyof typeof logLevelsConfig;

    return logLevelsConfig[ruleName] || defaultLevel;
}
