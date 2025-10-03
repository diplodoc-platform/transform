import type {Lang} from 'src/transform/typings';

import {getCoords} from '../term/utils';

import {INLINE_CODE, INLINE_CODE_ID, LANG_TOKEN, OPEN_CLASS} from './constant';

export let timer: ReturnType<typeof setTimeout> | null = null;

let isListenerNeeded = true;

export function getTooltipElement(): HTMLElement | null {
    return document.getElementById(INLINE_CODE_ID);
}

function setTooltipAriaAttributes(tooltipElement: HTMLElement, targetElement: HTMLElement): void {
    const ariaLive = targetElement.getAttribute('aria-live') || 'polite';
    tooltipElement?.setAttribute('aria-live', ariaLive);
    tooltipElement?.setAttribute('aria-modal', 'true');
}

function checkTimerAndClear() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
}

function tooltipParentElement(target: HTMLElement | null) {
    if (!target) {
        return null;
    }

    const closestScrollableParent = target.closest('table') || target.closest('code');

    return closestScrollableParent || target.parentElement;
}

function tooltipOnResize() {
    const openedDefinition = getTooltipElement();

    if (!openedDefinition) {
        return;
    }
    const inlineId = openedDefinition.getAttribute('inline-id') || '';
    const targetElement = document.getElementById(inlineId);

    if (!targetElement) {
        return;
    }

    setTooltipPosition(openedDefinition, targetElement);
}

export function setTooltipPosition(tooltipElement: HTMLElement, targetElement: HTMLElement): void {
    const {
        x: inlineX,
        y: inlineY,
        right: inlineRight,
        left: inlineLeft,
        width: inlineWidth,
        height: inlineHeight,
    } = targetElement.getBoundingClientRect();

    const tooltipParent = tooltipParentElement(targetElement);

    if (!tooltipParent) {
        return;
    }

    const {right: tooltipParentRight, left: tooltipParentLeft} =
        tooltipParent.getBoundingClientRect();

    if ((tooltipParentRight < inlineLeft || tooltipParentLeft > inlineRight) && !isListenerNeeded) {
        closeTooltip(tooltipElement);
        return;
    }

    if (isListenerNeeded && tooltipParent) {
        tooltipParent.addEventListener('scroll', tooltipOnResize);
        isListenerNeeded = false;
    }

    const relativeX = Number(tooltipElement.getAttribute('relativeX'));
    const relativeY = Number(tooltipElement.getAttribute('relativeY'));

    if (relativeX === inlineX && relativeY === inlineY) {
        return;
    }

    tooltipElement.setAttribute('relativeX', String(inlineX));
    tooltipElement.setAttribute('relativeY', String(inlineY));

    const offsetTop = inlineHeight + 5;
    const definitionParent = tooltipElement.parentElement;

    if (!definitionParent) {
        return;
    }

    const {width: definitionWidth} = tooltipElement.getBoundingClientRect();
    const {left: definitionParentLeft} = definitionParent.getBoundingClientRect();

    // If definition not fit document change base alignment
    const definitionLeftCoordinate = Number(getCoords(targetElement).left);
    const definitionRightCoordinate = definitionWidth + definitionLeftCoordinate;

    const definitionOutOfScreenOnLeft = definitionLeftCoordinate - definitionWidth < 0;
    const definitionOutOfScreenOnRight = definitionRightCoordinate > document.body.clientWidth;

    const isAlignSwapped = definitionOutOfScreenOnRight || document.dir === 'rtl';
    const fitDefinitionDocument =
        isAlignSwapped && !definitionOutOfScreenOnLeft ? definitionWidth - inlineWidth : 0;
    const customHeaderTop = getCoords(definitionParent).top - definitionParent.offsetTop;
    const offsetRight = 5;
    const shiftLeft = definitionOutOfScreenOnRight
        ? definitionRightCoordinate - document.body.clientWidth + offsetRight
        : 0;
    const offsetLeft =
        getCoords(targetElement).left -
        definitionParentLeft +
        definitionParent.offsetLeft -
        fitDefinitionDocument;

    const isShiftLeftNeeded = offsetLeft + definitionWidth >= document.body.clientWidth;

    tooltipElement.style.top =
        Number(getCoords(targetElement).top + offsetTop - customHeaderTop) + 'px';
    tooltipElement.style.left = Number(offsetLeft - (isShiftLeftNeeded ? shiftLeft : 0)) + 'px';
}

export function getInlineCodeByTooltip(definition: HTMLElement) {
    const inlineId = definition.getAttribute('inline-id');

    return inlineId ? document.getElementById(inlineId) : null;
}

function closeTooltipFn(definition: HTMLElement) {
    definition.classList.remove(OPEN_CLASS);
    const inline = getInlineCodeByTooltip(definition);
    const inlineCodepParent = tooltipParentElement(inline);
    const tooltipParent = tooltipParentElement(definition);

    definition.removeAttribute('inline-id');

    if (!inlineCodepParent || !tooltipParent) {
        return;
    }

    tooltipParent.removeChild(definition);
    inlineCodepParent.removeEventListener('scroll', tooltipOnResize);
    isListenerNeeded = true;
}

function createTooltip() {
    let tooltip = getTooltipElement();

    if (!tooltip) {
        const pageContent = document.querySelector('.dc-doc-page__content') || document.body;
        const lang = document.documentElement.lang || 'en';

        tooltip = document.createElement('div');

        tooltip.id = INLINE_CODE_ID;
        tooltip.className = 'yfm inline_code_tooltip';
        tooltip.role = 'dialog';
        tooltip.setAttribute('aria-live', 'polite');
        tooltip.setAttribute('aria-modal', 'true');
        tooltip.innerHTML = LANG_TOKEN[lang as Lang] ?? LANG_TOKEN.en;

        pageContent.appendChild(tooltip);
    }

    return tooltip;
}

export function openTooltip(target: HTMLElement) {
    const tooltip = createTooltip();

    if (!target.matches(INLINE_CODE) || !tooltip) {
        return;
    }

    tooltip.setAttribute('inline-id', target.getAttribute('id') || '');
    setTooltipAriaAttributes(tooltip, target);
    setTooltipPosition(tooltip, target);

    // In order not to get rid of the smooth appearance effect, I had to do this
    if (tooltip.classList.contains(OPEN_CLASS)) {
        tooltip.classList.remove(OPEN_CLASS);
        requestAnimationFrame(() => {
            tooltip.classList.add(OPEN_CLASS);
        });
    } else {
        tooltip.classList.add(OPEN_CLASS);
    }

    return tooltip;
}

export function closeTooltip(target: HTMLElement) {
    checkTimerAndClear();
    closeTooltipFn(target);
}

export function tooltipWorker(target: HTMLElement) {
    const definition = openTooltip(target);

    if (!definition) {
        return;
    }
    checkTimerAndClear();
    timer = setTimeout(() => {
        closeTooltip(definition);
        timer = null;
    }, 1000);
}
