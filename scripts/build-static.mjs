#!/usr/bin/env node

import esbuild from '@diplodoc/lint/esbuild';

import {copyScssFiles, runChainsWith} from './package-build-configs.mjs';

const executeBuild = (buildOptions) => esbuild.build(buildOptions);

await runChainsWith(executeBuild);
await copyScssFiles();
