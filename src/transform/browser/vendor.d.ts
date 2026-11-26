declare module 'css/lib/parse/index.js' {
    import type {CssAdapter} from '../sanitize-core';

    const parse: CssAdapter['parse'];
    export default parse;
}

declare module 'css/lib/stringify/identity.js' {
    import type {CssAdapter} from '../sanitize-core';

    class Compiler {
        compile(stylesheet: Parameters<CssAdapter['stringify']>[0]): string;
    }
    export default Compiler;
}
