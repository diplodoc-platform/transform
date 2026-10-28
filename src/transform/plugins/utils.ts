import {bold} from 'chalk';
import {platform} from 'process';

import {createNestedCloseTokenIdxFactory} from './pure-utils';

export type {IDGenerator, IDGeneratorStrategy, MatchTokenFunction} from './pure-utils';
export {append, createIDGenerator, createIDGeneratorByStrategy, generateID} from './pure-utils';

export const nestedCloseTokenIdxFactory = createNestedCloseTokenIdxFactory(bold);
export const сarriage = platform === 'win32' ? '\r\n' : '\n';
