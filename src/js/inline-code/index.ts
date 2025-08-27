import {copyToClipboard, getEventTarget, isCustom} from '../utils';

import {INLINE_CODE, OPEN_CLASS} from './constant';
import {
    closeTooltip,
    getInlineCodeByTooltip,
    getTooltipElement,
    setTooltipPosition,
    tooltipWorker,
} from './utils';

export function inlineCopyFn(target: HTMLElement) {
    const innerText = target.innerText;

    if (!innerText) {
        return;
    }

    copyToClipboard(innerText).then(() => {
        tooltipWorker(target);
    });
}

if (typeof document !== 'undefined') {
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
            const classInlineCode = INLINE_CODE.replace('.', '');

            if (!activeElement.classList.contains(classInlineCode)) {
                return;
            }

            const innerText = activeElement.innerText;

            if (!innerText) {
                return;
            }

            copyToClipboard(innerText).then(() => {
                tooltipWorker(activeElement);
            });
        }

        const inlineTooltip = getTooltipElement();

        if (event.key === 'Escape' && inlineTooltip) {
            closeTooltip(inlineTooltip);
            getInlineCodeByTooltip(inlineTooltip)?.focus(); // Set focus back to open button after closing popup
        }
    });

    window.addEventListener('resize', () => {
        const inlineTooltip = getTooltipElement();
        if (!inlineTooltip) {
            return;
        }

        const inlineId = inlineTooltip.getAttribute('inline-id') || '';
        const inlineCodeElement = document.getElementById(inlineId);

        if (!inlineCodeElement) {
            inlineTooltip.classList.toggle(OPEN_CLASS);
            return;
        }

        setTooltipPosition(inlineTooltip, inlineCodeElement);
    });
}
