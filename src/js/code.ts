import {
    Selector,
    closeDefinition,
    openClass,
    setDefinitionId,
    setDefinitionPosition,
    setDefinitonAriaAttributes,
    trapFocus,
} from './term/utils';
import {copyToClipboard, getEventTarget, isCustom} from './utils';

const BUTTON_SELECTOR = '.yfm-clipboard-button';
const INLINE_CODE = '.yfm-clipboard-inline-code';
let timer: ReturnType<typeof setTimeout> | null = null;

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

function checkTimerAndClear() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
}

function openDefinitionInlineCode(target: HTMLElement) {
    const openedDefinition = document.getElementsByClassName('open')[0] as HTMLElement;

    const termId = target.getAttribute('id');
    const termKey = target.getAttribute('term-key');
    const definitionElement = document.getElementById(termKey + '_element');

    const isSameTerm = openedDefinition && termId === openedDefinition.getAttribute('term-id');
    if (isSameTerm) {
        checkTimerAndClear();
        closeDefinition(openedDefinition);
        return;
    }

    const isTargetDefinitionContent = target.closest(
        [Selector.CONTENT.replace(' ', ''), openClass].join('.'),
    );

    if (openedDefinition && !isTargetDefinitionContent) {
        checkTimerAndClear();
        closeDefinition(openedDefinition);
    }

    if (!target.matches('.yfm-clipboard-inline-code') || !definitionElement) {
        return;
    }

    setDefinitionId(definitionElement, target);
    setDefinitonAriaAttributes(definitionElement, target);
    setDefinitionPosition(definitionElement, target);

    definitionElement.classList.toggle(openClass);

    trapFocus(definitionElement);

    return definitionElement;
}

function inlineCopyFn(target: HTMLElement) {
    const innerText = target.innerText;

    if (!innerText) {
        return;
    }

    copyToClipboard(innerText).then(() => {
        const definition = openDefinitionInlineCode(target);

        if (!definition) {
            return;
        }

        checkTimerAndClear();
        timer = setTimeout(() => {
            if (definition) {
                closeDefinition(definition);
            }
            timer = null;
        }, 5000);
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
