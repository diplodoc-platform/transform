import { LogLevels } from '../log';
import { LintError } from 'markdownlint';
import { Dictionary } from 'lodash';
export declare function errorToString(path: string, error: LintError, sourceMap?: Dictionary<string>): string;
export declare function getLogLevel(opts: {
    ruleNames: string[];
    logLevelsConfig: Record<string, LogLevels>;
    defaultLevel: LogLevels;
}): LogLevels;
