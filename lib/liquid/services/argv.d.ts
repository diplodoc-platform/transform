export declare type ArgvSettings = {
    conditions?: boolean;
    conditionsInCode?: boolean;
    cycles?: boolean;
    substitutions?: boolean;
    keepNotVar?: boolean;
    withSourceMap?: boolean;
};
export declare function getConfig(): ArgvSettings;
export declare function init(argv: ArgvSettings): void;
declare const _default: {
    init: typeof init;
    getConfig: typeof getConfig;
};
export default _default;
