import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};
import type {IDGenerator} from '@diplodoc/utils';

import {transform} from '@diplodoc/tabs-extension';

const tabs: (md: MarkdownIt, options?: {output?: string; generateID?: IDGenerator}) => void =
    transform({
        bundle: false,
        features: {
            enabledVariants: {
                radio: true,
                regular: true,
                dropdown: true,
                accordion: true,
            },
        },
    });

export default tabs;
