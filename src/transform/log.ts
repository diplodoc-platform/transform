import {green, red, yellow} from 'chalk';

import {createDiagnosticHost} from './log-core';

export {LogLevels} from './log-core';
export type {Logger, LogConsumer} from './log-core';

const {log, getLogger, warnInScope} = createDiagnosticHost({
    info: () => green('INFO'),
    warn: () => yellow('WARN'),
    error: () => red('ERR'),
});

export {log, getLogger, warnInScope};
export default log;
