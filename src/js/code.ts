import {isCustom} from './utils';

const BUTTON_SELECTOR = '.yfm-clipboard-button';

function copyToClipboard(text: string) {
    if (!text) {
        return Promise.resolve();
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.setAttribute('style', 'position: absolute; left: 1000%');
    textarea.textContent = text;
    document.body.append(textarea);

    textarea.select();
    document.execCommand('copy');

    document.body.removeChild(textarea);

    return Promise.resolve();
}

function notifySuccess(svgButton: HTMLElement | null) {
    if (!svgButton) {
        return;
    }

    const id = svgButton.getAttribute('data-animation');
    const icon = document.getElementById(
        `visibileAnimation-${id}`,
    ) as unknown as SVGAnimationElement;

    if (!icon) {
        return;
    }

    icon.beginElement();
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (isCustom(event) || !(event.target as HTMLElement).matches(BUTTON_SELECTOR)) {
            return;
        }

        const parent = (event.target as HTMLElement).parentNode;
        if (!parent) {
            return;
        }

        const code = parent.querySelector<HTMLElement>('pre code');
        if (!code) {
            return;
        }

        copyToClipboard(code.innerText).then(() => {
            notifySuccess(parent.querySelector('.yfm-clipboard-button'));
        });
    });
}
