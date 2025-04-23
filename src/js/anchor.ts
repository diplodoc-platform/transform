import {copyToClipboard, getEventTarget, isCustom} from './utils';

const ANCHOR_BUTTON_SELECTOR = '.yfm-clipboard-anchor';

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;

        if (isCustom(event) || !target.matches(ANCHOR_BUTTON_SELECTOR)) {
            return;
        }

        const href = target.getAttribute('data-href') || '';
        const link = window.location.href + href;

        copyToClipboard(link);
    });
}
