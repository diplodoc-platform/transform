import {getEventTarget, isCustom} from './utils';

const BUTTON_SELECTOR = '.yfm-clipboard-button';

function copyToClipboard(text) {
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

function notifySuccess(svgButton) {
    if (!svgButton) {
        return;
    }

    const id = svgButton.getAttribute('data-animation');
    const icon = svgButton.getRootNode().getElementById(`visibileAnimation-${id}`);

    if (!icon) {
        return;
    }

    icon.beginElement();

}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event);

        if (isCustom(event) || !target.matches(BUTTON_SELECTOR)) {
            return;
        }

        const parent = target.parentNode;
        if (!parent) {
            return;
        }

        const code = parent.querySelector('pre code');
        if (!code) {
            return;
        }

        copyToClipboard(code.innerText)
            .then(() => {
                notifySuccess(parent.querySelector('.yfm-clipboard-button'));
            });
    });
}