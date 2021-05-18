import {LOG_LEVELS} from '../constants';
import {Logger} from '../log';

export interface LintRuleOptions {
    value?: any;
    disabled?: boolean;
    level?: LOG_LEVELS;
}

export interface LintRulesOptions {
    [lintRuleName: string]: LintRuleOptions,
}

export interface LintCommonOptions {
    log: Logger;
    path: string;
    disableLint?: boolean;
}

export interface LintRuleParams {
    input?: string;
    commonOptions: LintCommonOptions;
    lintOptions?: LintRulesOptions;
}

export interface LintRuleFunction {
    (params: LintRuleParams): void;
    ruleName: string;
    ruleOptions: LintRuleOptions;
}
