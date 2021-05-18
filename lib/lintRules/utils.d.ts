import {LintRuleParams, LogLevelsEnum} from './models';

export function withLintRuleWrapper(params: LintRuleParams): void;

export function isSupportedLevel(level: LogLevelsEnum): boolean;

export function compareLogLevels(levelA: LogLevelsEnum, levelB: LogLevelsEnum): number;
