import meta from '@diplodoc/transform/lib/plugins/meta';
import sup from '@diplodoc/transform/lib/plugins/sup';
import cut from '@diplodoc/transform/lib/plugins/cut';
import checkbox from '@diplodoc/transform/lib/plugins/checkbox';
import anchors from '@diplodoc/transform/lib/plugins/anchors';
import monospace from '@diplodoc/transform/lib/plugins/monospace';
import imsize from '@diplodoc/transform/lib/plugins/imsize';
import file from '@diplodoc/transform/lib/plugins/file';
import includes from '@diplodoc/transform/lib/plugins/includes';
import tabs from '@diplodoc/transform/lib/plugins/tabs';
import video from '@diplodoc/transform/lib/plugins/video';
import table from '@diplodoc/transform/lib/plugins/table';
import notes from '@diplodoc/transform/lib/plugins/notes';
import transform from '@diplodoc/transform';

import {OptionsType} from '../../../lib/typings';

const transformOptions: OptionsType = {
    lang: 'en',
    path: '',
    plugins: [
        meta,
        sup,
        cut,
        checkbox,
        anchors,
        monospace,
        imsize,
        file,
        includes,
        tabs,
        video,
        table,
        notes,
    ],
};

export const transformMd = (input: string, customOptions?: OptionsType): string => {
    const {result} = transform(input, {...transformOptions, ...customOptions});

    return result.html;
};
