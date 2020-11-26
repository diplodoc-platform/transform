export function resolveRelativePath(fromPath: string, relativePath: string): string;

export function isLocalUrl(path?: string): string;

export function getSinglePageAnchorId(options: {root: string; currentPath: string, pathname?:string, hash?: string}): string;
