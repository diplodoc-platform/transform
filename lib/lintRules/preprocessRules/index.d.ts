import {LintRuleFunction} from '../models';

export interface LintRules {
    inlineCodeMaxLen: LintRuleFunction;
}

declare let lintRules: LintRules;

export default lintRules;
