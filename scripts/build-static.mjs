#!/usr/bin/env node

import {build} from '@diplodoc/lint/esbuild';

import {copyScssFiles, runChainsWith} from './package-build-configs.mjs';

const executeBuild = (buildOptions) => build(buildOptions);

await runChainsWith(executeBuild);
await copyScssFiles();
