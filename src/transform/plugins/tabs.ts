import {transform} from '@diplodoc/tabs-extension';

export = transform({
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
