import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

/** Private inline-buffer coordinates; these are not document coordinates. */
export interface ImageSizeSpan {
    readonly source: string;
    readonly path?: string;
    readonly imageStart: number;
    readonly imageEnd: number;
    readonly sizeStart: number;
    readonly sizeEnd: number;
    readonly width: string;
    readonly height: string;
    readonly adjacentAttributes: boolean;
}

export interface ImageSizeObserver {
    image(span: ImageSizeSpan, token: Token): void;
    rejected?(source: string, imageStart: number, sizeStart: number): void;
}

const legacySize = Symbol('legacy image size');

/**
 * Keep diagnostics out of public/custom token metadata.
 * @param token - Successfully parsed image.
 * @param path - Actual inline environment path, when available.
 * @returns Nothing; attaches a private non-enumerable marker.
 */
export function markLegacyImage(token: Token, path?: string): void {
    Object.defineProperty(token, legacySize, {value: {path}});
}

/**
 * Read only the private recognition marker.
 * @param token - Possible legacy image token.
 * @returns Recognition context, or undefined for other tokens.
 */
export function legacyImageUsage(token: Token): {path?: string} | undefined {
    return Object.getOwnPropertyDescriptor(token, legacySize)?.value;
}
