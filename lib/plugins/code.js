/* eslint-disable max-len */

const wrapInClipboard = (element, id) => {
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


module.exports = function code(md) {
    const superCodeRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const superCode = superCodeRenderer(tokens, idx, options, env, self);

        return wrapInClipboard(superCode, idx);
    };

};
