import {copyToClipboard, getEventTarget, isCustom} from './utils';

const COPY_BUTTON_SELECTOR = '.yfm-clipboard-button';
const WRAP_BUTTON_SELECTOR = '.yfm-wrapping-button';
const FLOATING_CONTAINER_SELECTOR = '.yfm-code-floating-container';
const SELECTED_WRAP_BUTTON = 'g-button_selected';

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

    // Strip line-number decorations (class-based, no semantic alternative).
    const clone = code.cloneNode(true) as HTMLElement;

    clone.querySelectorAll('.yfm-line-number').forEach((el) => el.remove());
    let textContent = clone.textContent ?? '';

    // Strip prompt prefix from each line using the raw value stored in data-prompt.
    // This avoids any dependency on how (or whether) the prompt is wrapped in the DOM.
    // Leading whitespace before the prompt is preserved so indented commands keep
    // their indentation level in the copied text.
    const promptValue = code.dataset.prompt;
    if (promptValue) {
        const prefix = promptValue + ' ';
        textContent = textContent
            .split('\n')
            .map((line) => {
                const trimmed = line.trimStart();
                const leadingWs = line.slice(0, line.length - trimmed.length);
                if (trimmed.startsWith(prefix)) {
                    return leadingWs + trimmed.slice(prefix.length);
                }
                if (trimmed === promptValue) {
                    return leadingWs;
                }
                return line;
            })
            .join('\n');
    }

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
    const hasWrap = code.classList.toggle('wrap');

    button.classList.toggle(SELECTED_WRAP_BUTTON, hasWrap);
    button.setAttribute('aria-pressed', String(hasWrap));

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
