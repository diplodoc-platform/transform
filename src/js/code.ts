import {copyToClipboard, getEventTarget, isCustom} from './utils';

const COPY_BUTTON_SELECTOR = '.yfm-clipboard-button';
const WRAP_BUTTON_SELECTOR = '.yfm-wrapping-button';

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
    const container = target.parentNode?.parentNode;
    const code = container?.querySelector<HTMLElement>('pre code');
    if (!container || !code) {
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
    const container = target.parentNode?.parentNode;
    const code = container?.querySelector<HTMLElement>('pre code');
    if (!container || !code) {
        return;
    }

    code.classList.toggle('wrap');

    setTimeout(() => target.blur(), 500);
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (isCustom(event)) {
            return;
        }

        const target = getEventTarget(event) as HTMLElement;

        if (target.matches(COPY_BUTTON_SELECTOR)) {
            buttonCopyFn(target);
        } else if (target.matches(WRAP_BUTTON_SELECTOR)) {
            buttonWrapFn(target);
        }
    });
}
