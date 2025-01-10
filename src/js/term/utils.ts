export const Selector = {
    TITLE: '.yfm .yfm-term_title',
    CONTENT: '.yfm .yfm-term_dfn',
};
export const openClass = 'open';
export const openDefinitionClass = Selector.CONTENT.replace(/\./g, '') + ' ' + openClass;
let isListenerNeeded = true;

export function createDefinitionElement(termElement: HTMLElement) {
    const termKey = termElement.getAttribute('term-key');
    const definitionTemplate = document.getElementById(
        `${termKey}_template`,
    ) as HTMLTemplateElement;
    const definitionElement = definitionTemplate?.content.cloneNode(true).firstChild as HTMLElement;

    definitionTemplate?.parentElement?.appendChild(definitionElement);
    definitionTemplate.remove();

    return definitionElement;
}

export function setDefinitionId(definitionElement: HTMLElement, termElement: HTMLElement): void {
    const termId = termElement.getAttribute('id') || Math.random().toString(36).substr(2, 8);
    definitionElement?.setAttribute('term-id', termId);
}

export function setDefinitonAriaAttributes(
    definitionElement: HTMLElement,
    termElement: HTMLElement,
): void {
    const ariaLive = termElement.getAttribute('aria-live') || 'polite';
    definitionElement?.setAttribute('aria-live', ariaLive);
    definitionElement?.setAttribute('aria-modal', 'true');
}

export function setDefinitionPosition(
    definitionElement: HTMLElement,
    termElement: HTMLElement,
): void {
    const {
        x: termX,
        y: termY,
        right: termRight,
        left: termLeft,
        width: termWidth,
        height: termHeight,
    } = termElement.getBoundingClientRect();

    const termParent = termParentElement(termElement);

    if (!termParent) {
        return;
    }

    const {right: termParentRight, left: termParentLeft} = termParent.getBoundingClientRect();

    if ((termParentRight < termLeft || termParentLeft > termRight) && !isListenerNeeded) {
        closeDefinition(definitionElement);
        return;
    }

    if (isListenerNeeded && termParent) {
        termParent.addEventListener('scroll', termOnResize);
        isListenerNeeded = false;
    }

    const relativeX = Number(definitionElement.getAttribute('relativeX'));
    const relativeY = Number(definitionElement.getAttribute('relativeY'));

    if (relativeX === termX && relativeY === termY) {
        return;
    }

    definitionElement.setAttribute('relativeX', String(termX));
    definitionElement.setAttribute('relativeY', String(termY));

    const offsetTop = termHeight + 5;
    const definitionParent = definitionElement.parentElement;

    if (!definitionParent) {
        return;
    }

    const {width: definitionWidth} = definitionElement.getBoundingClientRect();
    const {left: definitionParentLeft} = definitionParent.getBoundingClientRect();

    // If definition not fit document change base alignment
    const definitionLeftCoordinate = Number(getCoords(termElement).left);
    const definitionRightCoordinate = definitionWidth + definitionLeftCoordinate;

    const definitionOutOfScreenOnLeft = definitionLeftCoordinate - definitionWidth < 0;
    const definitionOutOfScreenOnRight = definitionRightCoordinate > document.body.clientWidth;

    const isAlignSwapped = definitionOutOfScreenOnRight || document.dir === 'rtl';
    const fitDefinitionDocument =
        isAlignSwapped && !definitionOutOfScreenOnLeft ? definitionWidth - termWidth : 0;
    const customHeaderTop = getCoords(definitionParent).top - definitionParent.offsetTop;
    const offsetRight = 5;
    const shiftLeft = definitionOutOfScreenOnRight
        ? definitionRightCoordinate - document.body.clientWidth + offsetRight
        : 0;
    const offsetLeft =
        getCoords(termElement).left -
        definitionParentLeft +
        definitionParent.offsetLeft -
        fitDefinitionDocument;

    const isShiftLeftNeeded = offsetLeft + definitionWidth >= document.body.clientWidth;

    definitionElement.style.top =
        Number(getCoords(termElement).top + offsetTop - customHeaderTop) + 'px';
    definitionElement.style.left = Number(offsetLeft - (isShiftLeftNeeded ? shiftLeft : 0)) + 'px';
}

function termOnResize() {
    const openedDefinition = document.getElementsByClassName(openDefinitionClass)[0] as HTMLElement;

    if (!openedDefinition) {
        return;
    }
    const termId = openedDefinition.getAttribute('term-id') || '';
    const termElement = document.getElementById(termId);

    if (!termElement) {
        return;
    }

    setDefinitionPosition(openedDefinition, termElement);
}

function termParentElement(term: HTMLElement | null) {
    if (!term) {
        return null;
    }

    const closestScrollableParent = term.closest('table') || term.closest('code');

    return closestScrollableParent || term.parentElement;
}

export function openDefinition(target: HTMLElement) {
    const openedDefinition = document.getElementsByClassName(openDefinitionClass)[0] as HTMLElement;

    const termId = target.getAttribute('id');
    const termKey = target.getAttribute('term-key');
    let definitionElement = document.getElementById(termKey + '_element');

    if (termKey && !definitionElement) {
        definitionElement = createDefinitionElement(target);
    }

    const isSameTerm = openedDefinition && termId === openedDefinition.getAttribute('term-id');
    if (isSameTerm) {
        closeDefinition(openedDefinition);
        return;
    }

    const isTargetDefinitionContent = target.closest(
        [Selector.CONTENT.replace(' ', ''), openClass].join('.'),
    );

    if (openedDefinition && !isTargetDefinitionContent) {
        closeDefinition(openedDefinition);
    }

    if (!target.matches(Selector.TITLE) || !definitionElement) {
        return;
    }

    setDefinitionId(definitionElement, target);
    setDefinitonAriaAttributes(definitionElement, target);
    setDefinitionPosition(definitionElement, target);

    definitionElement.classList.toggle(openClass);

    trapFocus(definitionElement, target);
}

export function closeDefinition(definition: HTMLElement) {
    definition.classList.remove(openClass);
    const termId = definition.getAttribute('term-id') || '';
    const term = document.getElementById(termId);
    const termParent = termParentElement(term);

    if (!termParent) {
        return;
    }

    termParent.removeEventListener('scroll', termOnResize);
    term?.focus(); // Set focus back to open button after closing popup

    isListenerNeeded = true;
}

function getCoords(elem: HTMLElement) {
    const box = elem.getBoundingClientRect();

    const body = document.body;
    const docEl = document.documentElement;

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const clientTop = docEl.clientTop || body.clientTop || 0;
    const clientLeft = docEl.clientLeft || body.clientLeft || 0;

    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return {top: Math.round(top), left: Math.round(left)};
}

export function trapFocus(element: HTMLElement, termButton: HTMLElement) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // if another term was previously closed, the focus may still be on it
    if (!firstFocusableElement && document.activeElement !== termButton) {
        termButton.focus();
        return;
    }

    if (firstFocusableElement) {
        firstFocusableElement.focus();
    }

    element.addEventListener('keydown', function (e) {
        const isTabPressed = e.key === 'Tab' || e.keyCode === 9;
        if (!isTabPressed) {
            return;
        }

        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            e.preventDefault();
        }
    });
}
