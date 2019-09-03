const BUTTON_SELECTOR = '.yfm-clipboard-button';

function copyToClipboard(text) {
    if (!text) {
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.setAttribute('style', 'position: absolute; left: 1000%');
    textarea.textContent = text;
    document.body.append(textarea);

    textarea.select();
    document.execCommand('copy');

    document.body.removeChild(textarea);
}

function notifySuccess(svgButton) {
    if (!svgButton) {
        return;
    }

    const id = svgButton.getAttribute('data-animation');
    const icon = document.getElementById(`visibileAnimation-${id}`);

    if (!icon) {
        return;
    }

    icon.beginElement();

}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (!event.target.matches(BUTTON_SELECTOR)) {
            return;
        }

        const parent = event.target.parentNode;
        if (!parent) {
            return;
        }

        const code = parent.querySelector('pre code');
        if (!code) {
            return;
        }

        copyToClipboard(code.innerText);
        notifySuccess(parent.querySelector('.yfm-clipboard-button'));
    });
}
