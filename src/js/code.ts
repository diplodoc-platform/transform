import {copyToClipboard, getEventTarget, isCustom} from './utils';

const COPY_BUTTON_SELECTOR = '.yfm-clipboard-button';
const WRAP_BUTTON_SELECTOR = '.yfm-wrapping-button';
const FLOATING_CONTAINER_SELECTOR = '.yfm-code-floating-container';

function notifySuccess(svgButton: HTMLElement | null) {
    if (!svgButton) {
        return;
    }

    const id = svgButton.getAttribute('data-animation');

    // @ts-expect-error
    const icon = svgButton.getRootNode().getElementById(`visibileAnimation-${id}`);

    if (!icon) {
        return;
    }

    icon.beginElement();
}

function buttonCopyFn(target: HTMLElement) {
    const button = target.closest<HTMLElement>(COPY_BUTTON_SELECTOR);
    const container = button?.closest<HTMLElement>(FLOATING_CONTAINER_SELECTOR);
    const code = container?.querySelector<HTMLElement>('pre code');

    if (!button || !container || !code) {
        return;
    }

    // Get all text nodes and filter out line numbers
    const textContent = Array.from(code.childNodes)
        .filter((node) => {
            // Skip line number spans
            if (node instanceof HTMLElement && node.classList.contains('yfm-line-number')) {
                return false;
            }
            return true;
        })
        .map((node) => node.textContent)
        .join('');

    copyToClipboard(textContent.trim()).then(() => {
        notifySuccess(container.querySelector('.yfm-clipboard-icon'));

        setTimeout(() => target.blur(), 1500);
    });
}

function buttonWrapFn(target: HTMLElement) {
    const button = target.closest<HTMLElement>(WRAP_BUTTON_SELECTOR);
    const container = button?.closest<HTMLElement>(FLOATING_CONTAINER_SELECTOR);
    const code = container?.querySelector<HTMLElement>('pre code');
    if (!button || !container || !code) {
        return;
    }
    code.classList.toggle('wrap');
    button.setAttribute('aria-pressed', String(code.classList.contains('wrap')));

    setTimeout(() => target.blur(), 500);
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (isCustom(event)) {
            return;
        }

        const target = getEventTarget(event) as HTMLElement;

        if (target.closest(COPY_BUTTON_SELECTOR)) {
            buttonCopyFn(target);
        } else if (target.closest(WRAP_BUTTON_SELECTOR)) {
            buttonWrapFn(target);
        }
    });
}
