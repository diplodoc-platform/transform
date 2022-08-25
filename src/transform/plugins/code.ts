/* eslint-disable max-len */

import {MarkdownItPluginCb} from './typings';
import {generateID} from './utils';

const wrapInClipboard = (element: string | undefined, id: number) => {
    return `
    <div class="yfm-clipboard">
    ${element}
    <svg width="16" height="16" viewBox="0 0 24 24" class="yfm-clipboard-button" data-animation="${id}">
        <path
            fill="currentColor"
            d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"
        />
        <path
            stroke="currentColor"
            fill="transparent"
            strokeWidth="1.5"
            d="M9.5 13l3 3l5 -5"
            visibility="hidden"
        >
            <animate
                id="visibileAnimation-${id}"
                attributeName="visibility"
                from="hidden"
                to="visible"
                dur="0.2s"
                fill="freeze"
                begin=""
            />
            <animate
                id="hideAnimation-${id}"
                attributeName="visibility"
                from="visible"
                to="hidden"
                dur="1s"
                begin="visibileAnimation-${id}.end+1"
                fill="freeze"
            />
        </path>
    </svg>
    </div>
`;
};

interface EnvTerm {
    terms: {
        [keys: string]: string;
    };
}

function termReplace(str: string, env: EnvTerm): string {
    const regTerms = Object.keys(env.terms)
        .map((el) => el.substr(1))
        .join('|');
    const regText = '\\[([^\\[]+)\\](\\(\\*(' + regTerms + ')\\))';
    const reg = new RegExp(regText, 'g');

    const termCode = str.replace(
        reg,
        (_match: string, p1: string, _p2: string, p3: string) =>
            `<i class="yfm yfm-term_title" term-key=":${p3}" id="${generateID()}">${p1}</i>`,
    );

    return termCode || str;
}

const code: MarkdownItPluginCb = (md) => {
    const superCodeRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const superCode = superCodeRenderer?.(tokens, idx, options, env, self);
        const superCodeWithTerms =
            superCode && env?.terms ? termReplace(superCode, env) : superCode;

        return wrapInClipboard(superCodeWithTerms, idx);
    };
};

export = code;
