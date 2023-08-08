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

        const indexed = params.tokens.map((token, i) => [token, i] as const);
        const templates = indexed.filter(([token]) => {
            return token.type === 'template_open' || token.type === 'template_close';
        });
        const [, lastClose] = templates[templates.length - 1];

        if (lastClose !== params.tokens.length - 1) {
            onError({
                lineNumber: params.tokens[lastClose + 1].lineNumber,
                detail: 'There should be nothing after term definition.',
            });
        }

        for (let i = 1; i < templates.length - 1; i += 2) {
            const [, closeIndex] = templates[i];
            const [, openIndex] = templates[i + 1];

            if (openIndex === closeIndex + 1) {
                continue;
            }

            if (
                openIndex === closeIndex + 2 &&
                params.tokens[closeIndex + 1].type === '__yfm_lint'
            ) {
                continue;
            }

            onError({
                lineNumber: params.tokens[closeIndex + 1].lineNumber,
                detail: 'There is a content between term definition. All term defitions should be placed at the end of file.',
            });
        }
    },
};
