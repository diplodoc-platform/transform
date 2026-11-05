import {createDiagnosticHost} from './log-core';
import {diagnosticLabels} from './diagnostic-context';

export {LogLevels} from './log-core';
export type {
    Logger,
    LogConsumer,
    DiagnosticCollector,
    DiagnosticLogs,
    DiagnosticOptions,
} from './log-core';
export {createDiagnosticCollector} from './diagnostic-context';

const {log, getLogger, warnInScope} = createDiagnosticHost(diagnosticLabels);

export {log, getLogger, warnInScope};
export default log;
