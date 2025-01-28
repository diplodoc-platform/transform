#!/usr/bin/env node
/* eslint-disable no-undef */

import {runPlaygroundInDev} from '../playground/scripts/dev.mjs';

import {dispose, watch} from './watch-static.mjs';

process.on('SIGINT', () => dispose().then(() => process.exit(0)));
process.on('SIGTERM', () => dispose().then(() => process.exit(0)));

await Promise.all([runPlaygroundInDev(), watch()]);
