import {createDeprecationReporter} from '../../deprecation';

import {createTablePlugin} from './core';

const yfmTable = createTablePlugin(createDeprecationReporter);

export default yfmTable;
