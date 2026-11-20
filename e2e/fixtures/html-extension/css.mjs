import parse from 'css/lib/parse/index.js';
import Compiler from 'css/lib/stringify/identity.js';

export default {parse, stringify: (stylesheet) => new Compiler().compile(stylesheet)};
