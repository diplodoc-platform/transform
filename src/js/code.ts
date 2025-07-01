import {copyToClipboard, getEventTarget, isCustom} from './utils';

const BUTTON_SELECTOR = '.yfm-clipboard-button';
const INLINE_CODE = '.yfm-clipboard-inline-code';

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
    const parent = target.parentNode;

    if (!parent) {
        return;
    }

    const code = parent.querySelector<HTMLElement>('pre code');
    if (!code) {
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

    copyToClipboard(textContent).then(() => {
        notifySuccess(parent.querySelector('.yfm-clipboard-icon'));
    });
}

function inlineCopyFn(target: HTMLElement) {
    const innerText = target.innerText;

    if (!innerText) {
        return;
    }

    copyToClipboard(innerText).then(() => {
        // SUCCESS
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;

        const button = target.matches(BUTTON_SELECTOR);
        const inline = target.matches(INLINE_CODE);

        if (isCustom(event) || [button, inline].every((e) => e !== true)) {
            return;
        }

        if (button) {
            buttonCopyFn(target);
        } else if (inline) {
            inlineCopyFn(target);
        }
    });
}
