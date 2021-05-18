import {LintRuleFunction} from '../models';

export interface LintRules {
    inlineCodeMaxLen: LintRuleFunction;
    titleSyntax: LintRuleFunction;
}

declare let lintRules: LintRules;

export default lintRules;
