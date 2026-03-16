type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export interface ElementRect {
    readonly top: number;
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
}

export interface Coords {
    x: number;
    y: number;
}

export interface OffsetValues {
    mainAxis?: number;
    crossAxis?: number;
}

export type Alignment = 'start' | 'end';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type AlignedPlacement = `${Side}-${Alignment}`;

export type Placement = Prettify<Side | AlignedPlacement>;

export type SideObject = {[key in Side]: number};

export interface TooltipContextElements {
    reference: HTMLElement;
    tooltip: HTMLElement;
    offsetParent: HTMLElement;
}

export interface TooltipContext {
    isRtl: boolean;
    viewport: ElementRect;
    reference: ElementRect;
    tooltip: ElementRect;
    elements: TooltipContextElements;
}

export interface TooltipElementOptions {
    text: string;
    className?: string;
}

export interface TooltipOptions {
    closeDelay?: number;
    additionalClassName?: string;
    placement?: Placement;
    offset?: OffsetValues;
    flip?: boolean;
}
