import {Rule} from 'markdownlint';

export const yfm009: Rule = {
    names: ['YFM009', 'no-term-definition-in-content'],
    description: 'Term definition should be placed at the end of file',
    tags: ['term'],
    function: function YFM009(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        let lastCloseIndex = -1;
        const size = params.tokens.length;

        for (let i = 0; i < size; i++) {
            if (params.tokens[i].type === 'template_close') {
                lastCloseIndex = i;
            }

            if (params.tokens[i].type !== 'template_close') {
                continue;
            }

            if (i === size - 1) {
                continue;
            }

            if (params.tokens[i + 1].type === 'template_open') {
                continue;
            }

            if (i < size - 2 && params.tokens[i + 2].type === 'template_open') {
                continue;
            }

            onError({
                lineNumber: params.tokens[i + 1].lineNumber,
                detail: 'There is a content between term definition. All term defitions should be placed at the end of file.',
            });
        }

        if (lastCloseIndex === -1) {
            return;
        }

        if (lastCloseIndex !== size - 1) {
            onError({
                lineNumber: params.tokens[lastCloseIndex + 1].lineNumber,
                detail: 'The file must end with term only.',
            });
        }
    },
};
