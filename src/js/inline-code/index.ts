import type {Lang} from 'src/transform/typings';

import {createTooltipFactory} from '../tooltip';
import {copyToClipboard, getEventTarget, isCustom} from '../utils';
import {COPIED_LANG_TOKEN} from '../constant';

import {INLINE_CODE} from './constant';

const CLASS_INLINE_CODE = INLINE_CODE.replace('.', '');

const tooltip = createTooltipFactory({
    // NOTE: Add additional className for backward capability
    additionalClassName: 'inline_code_tooltip',
});

export function inlineCopyFn(target: HTMLElement) {
    const innerText = target.innerText;

    if (!innerText) {
        return;
    }

    copyToClipboard(innerText).then(() => {
        const lang = document.documentElement.lang || 'en';
        const tooltipText = COPIED_LANG_TOKEN[lang as Lang] ?? COPIED_LANG_TOKEN.en;

        tooltip.show(target, tooltipText);
    });
}

if (typeof document !== 'undefined') {
    tooltip.init();

    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;
        const inline = target.matches(INLINE_CODE);

        if (isCustom(event) || !inline) {
            return;
        }

        inlineCopyFn(target);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && document.activeElement) {
            const activeElement = document.activeElement as HTMLElement;

            if (!activeElement.classList.contains(CLASS_INLINE_CODE)) {
                return;
            }

            inlineCopyFn(activeElement);
        }

        if (event.key === 'Escape' && tooltip.visible) {
            const reference = tooltip.getActiveReference();

            tooltip.hide();
            // Set focus back to open button after closing popup
            reference?.focus();
        }
    });
}
