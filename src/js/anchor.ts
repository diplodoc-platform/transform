import type {Lang} from 'src/transform/typings';

import {createTooltipFactory} from './tooltip';
import {copyToClipboard, getEventTarget, isCustom} from './utils';
import {COPIED_LANG_TOKEN} from './constant';

const ALLOWED_PROTOCOL_RE = /^(?:https?|file):$/;
const ANCHOR_BUTTON_SELECTOR = '.yfm-clipboard-anchor';

const tooltip = createTooltipFactory();

function getLink(target: HTMLElement) {
    const href = target.nodeName === 'A' ? (target as HTMLAnchorElement).href : target.dataset.href;
    const link = new URL(href || '', window.location.href);

    if (ALLOWED_PROTOCOL_RE.test(link.protocol)) {
        return link.href;
    }

    return window.location.href;
}

if (typeof document !== 'undefined') {
    tooltip.init();

    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;

        if (isCustom(event) || !target.matches(ANCHOR_BUTTON_SELECTOR)) {
            return;
        }

        const link = getLink(target);

        copyToClipboard(link).then(() => {
            const lang = document.documentElement.lang || 'en';
            const tooltipText = COPIED_LANG_TOKEN[lang as Lang] ?? COPIED_LANG_TOKEN.en;

            tooltip.show(target, tooltipText);
        });
    });
}
