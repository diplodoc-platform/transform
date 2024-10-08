export type ArgvSettings = {
    conditions?: boolean | 'strict';
    conditionsInCode?: boolean;
    cycles?: boolean;
    substitutions?: boolean;
    keepNotVar?: boolean;
    withSourceMap?: boolean;
    useLegacyConditions?: boolean;
};

let _argv: ArgvSettings;

export function getConfig() {
    return _argv || {};
}

export function init(argv: ArgvSettings) {
    _argv = {...argv};
}

export default {
    init,
    getConfig,
};
