#!/usr/bin/env node

import esbuild from 'esbuild';

import {runChainsWith} from './package-build-configs.mjs';

const executeBuild = (buildOptions) => esbuild.build(buildOptions);

await runChainsWith(executeBuild);
