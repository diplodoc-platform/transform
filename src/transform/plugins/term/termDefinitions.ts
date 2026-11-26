import {parseDocumentFragment} from '../../document';

import {createTermDefinitions} from './definitions-core';

export const termDefinitions = createTermDefinitions(parseDocumentFragment);
