import type * as Svgo from 'svgo' with {'resolution-mode': 'import'};

// Keep a static require for the isolated production bundle and CommonJS declaration compatibility.
const svgo = require('svgo') as typeof Svgo;

export const optimize = svgo.optimize;
export type PluginConfig = Svgo.PluginConfig;
