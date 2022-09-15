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
    const definitionRightCoordinate = definitionWidth + Number(getCoords(termElement).left);
    const fitDefinitionDocument =
        document.body.clientWidth > definitionRightCoordinate ? 0 : definitionWidth - termWidth;

    const customHeaderTop = getCoords(definitionParent).top - definitionParent.offsetTop;

    definitionElement.style.top =
        Number(getCoords(termElement).top + offsetTop - customHeaderTop) + 'px';
    definitionElement.style.left =
        Number(
            getCoords(termElement).left -
                definitionParentLeft +
                definitionParent.offsetLeft -
                fitDefinitionDocument,
        ) + 'px';
}

function termOnResize() {
    const openDefinition = document.getElementsByClassName(openDefinitionClass)[0] as HTMLElement;

    if (!openDefinition) {
        return;
    }
    const termId = openDefinition.getAttribute('term-id') || '';
    const termElement = document.getElementById(termId);

    if (!termElement) {
        return;
    }

    setDefinitionPosition(openDefinition, termElement);
}

function termParentElement(term: HTMLElement | null) {
    if (!term) {
        return null;
    }

    const closestScrollableParent = term.closest('table') || term.closest('code');

    return closestScrollableParent || term.parentElement;
}

export function closeDefinition(definition: HTMLElement) {
    definition.classList.remove(openClass);
    const termId = definition.getAttribute('term-id') || '';
    const termParent = termParentElement(document.getElementById(termId));

    if (!termParent) {
        return;
    }

    termParent.removeEventListener('scroll', termOnResize);
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
