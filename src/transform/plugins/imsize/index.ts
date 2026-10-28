import {createDeprecationReporter} from '../../deprecation';

import {createImsizePlugin} from './core';

const imsize = createImsizePlugin(createDeprecationReporter);

export default imsize;
