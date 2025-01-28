import esbuild from 'esbuild';

import {runChainsWith} from './package-build-configs.mjs';

const runningContexts = [];

const _watch = async (buildOptions) => {
    const ctx = await esbuild.context(buildOptions);

    runningContexts.push(ctx);

    return ctx.watch();
};

export const watch = () => runChainsWith(_watch);
export const dispose = () => Promise.all(runningContexts.map((ctx) => ctx.dispose()));
