import type {
    Alignment,
    Coords,
    ElementRect,
    OffsetValues,
    Placement,
    Side,
    SideObject,
} from './types';

import {DEFAULT_SIDE_OBJECT, OPPOSITE_SIDES} from './constant';

function isVerticalSide(side: Side): boolean {
    return side === 'top' || side === 'bottom';
}

function createSideObject(value: Partial<SideObject> | number = 0): SideObject {
    if (typeof value === 'number') {
        return {top: value, bottom: value, left: value, right: value};
    }

    return {...DEFAULT_SIDE_OBJECT, ...value};
}

function parsePlacement(placement: Placement): {side: Side; alignment?: Alignment} {
    const [side, alignment] = placement.split('-') as [Side, Alignment | undefined];

    return {side, alignment};
}

function getOppositeSide(side: Side): Side {
    return OPPOSITE_SIDES[side];
}

function flipPlacement(placement: Placement): Placement {
    const {side, alignment} = parsePlacement(placement);
    const opposite = getOppositeSide(side);

    return (alignment ? `${opposite}-${alignment}` : opposite) as Placement;
}

function getOverflow(tooltip: ElementRect, coords: Coords, viewport: ElementRect): SideObject {
    const rect = updateRect(tooltip, {top: coords.y, left: coords.x});

    return detectOverflow(viewport, rect, 5);
}

function shouldFlip(overflow: SideObject, flippedOverflow: SideObject, side: Side): boolean {
    const opposite = getOppositeSide(side);

    return overflow[side] > 0 && flippedOverflow[opposite] < overflow[side];
}

export function computePosition(
    reference: ElementRect,
    tooltip: ElementRect,
    viewport: ElementRect,
    placement: Placement,
    offset: OffsetValues,
    isRtl: boolean,
    flip = true,
): {coords: Coords; placement: Placement} {
    const coords = computeCoordsFromPlacement(reference, tooltip, offset, placement, isRtl);

    if (!flip) {
        return {coords, placement};
    }

    const overflow = getOverflow(tooltip, coords, viewport);
    const {side} = parsePlacement(placement);

    if (overflow[side] <= 0) {
        return {coords, placement};
    }

    const flipped = flipPlacement(placement);
    const flippedCoords = computeCoordsFromPlacement(reference, tooltip, offset, flipped, isRtl);
    const flippedOverflow = getOverflow(tooltip, flippedCoords, viewport);

    if (shouldFlip(overflow, flippedOverflow, side)) {
        return {coords: flippedCoords, placement: flipped};
    }

    return {coords, placement};
}

export function generateId() {
    const random = Math.random().toString(36).substring(2, 6);
    const now = Date.now().toString(36);

    return `${random}${now}`;
}

export function createRect(
    params: Pick<ElementRect, 'top' | 'left' | 'width' | 'height'>,
): ElementRect {
    return {
        ...params,
        right: params.left + params.width,
        bottom: params.top + params.height,
    };
}

export function updateRect(rect: ElementRect, params: Partial<ElementRect>): ElementRect {
    return createRect({
        top: params.top ?? rect.top,
        left: params.left ?? rect.left,
        width: params.width ?? rect.width,
        height: params.height ?? rect.height,
    });
}

export function getViewportRect(): ElementRect {
    const {documentElement, body} = document;

    const scrollTop = window.scrollY || documentElement.scrollTop || body.scrollTop;
    const scrollLeft = window.scrollX || documentElement.scrollLeft || body.scrollLeft;

    const clientTop = documentElement.clientTop || body.clientTop || 0;
    const clientLeft = documentElement.clientLeft || body.clientLeft || 0;

    return createRect({
        top: Math.round(scrollTop - clientTop),
        left: Math.round(scrollLeft - clientLeft),
        width: document.body.clientWidth,
        height: document.body.clientHeight,
    });
}

export function getElementRect(element: HTMLElement): ElementRect {
    const viewport = getViewportRect();
    const box = element.getBoundingClientRect();

    return createRect({
        top: Math.round(box.top + viewport.top),
        left: Math.round(box.left + viewport.left),
        width: box.width,
        height: box.height,
    });
}

export function computeAxisOffset(offset: OffsetValues, side: Side, isRtl?: boolean): Coords {
    const {mainAxis = 0, crossAxis = 0} = offset;

    const isVertical = isVerticalSide(side);
    const mainDirection = side === 'top' || side === 'left' ? -1 : 1;
    const crossDirection = isRtl && isVertical ? -1 : 1;

    const mainOffset = mainAxis * mainDirection;
    const crossOffset = crossAxis * crossDirection;

    if (isVertical) {
        return {x: crossOffset, y: mainOffset};
    }

    return {x: mainOffset, y: crossOffset};
}

export function computeCoordsFromPlacement(
    reference: ElementRect,
    tooltip: ElementRect,
    offset: OffsetValues,
    placement: Placement,
    isRtl: boolean,
) {
    const {side, alignment} = parsePlacement(placement);
    const isVertical = isVerticalSide(side);
    const alignmentAxis = isVertical ? 'x' : 'y';
    const alignLength = alignmentAxis === 'y' ? 'height' : 'width';

    const centerX = reference.left + reference.width / 2 - tooltip.width / 2;
    const centerY = reference.top + reference.height / 2 - tooltip.height / 2;
    const alignmentOffset = reference[alignLength] / 2 - tooltip[alignLength] / 2;

    const coords: Coords = {x: reference.left, y: reference.top};

    switch (side) {
        case 'top': {
            coords.x = centerX;
            coords.y = reference.top - tooltip.height;
            break;
        }

        case 'bottom': {
            coords.x = centerX;
            coords.y = reference.top + reference.height;
            break;
        }

        case 'right': {
            coords.x = reference.left + reference.width;
            coords.y = centerY;
            break;
        }

        case 'left': {
            coords.x = reference.left - tooltip.width;
            coords.y = centerY;
            break;
        }
    }

    switch (alignment) {
        case 'start': {
            coords[alignmentAxis] -= alignmentOffset * (isRtl && isVertical ? -1 : 1);
            break;
        }

        case 'end': {
            coords[alignmentAxis] += alignmentOffset * (isRtl && isVertical ? -1 : 1);
            break;
        }
    }

    const axisOffset = computeAxisOffset(offset, side, isRtl);

    coords.x += axisOffset.x;
    coords.y += axisOffset.y;

    return coords;
}

export function convertToRelativeToOffsetParentRect(rect: ElementRect, offsetParent: HTMLElement) {
    const offsetRect = getElementRect(offsetParent);

    return createRect({
        top: rect.top - offsetRect.top + offsetParent.offsetTop,
        left: rect.left - offsetRect.left + offsetParent.offsetLeft,
        width: rect.width,
        height: rect.height,
    });
}

export function detectOverflow(
    boundary: ElementRect,
    element: ElementRect,
    padding: Partial<SideObject> | number = 0,
): SideObject {
    const {top, bottom, left, right} = createSideObject(padding);

    return {
        top: boundary.top - element.top + top,
        bottom: element.bottom - boundary.bottom + bottom,
        left: boundary.left - element.left + left,
        right: element.right - boundary.right + right,
    };
}
