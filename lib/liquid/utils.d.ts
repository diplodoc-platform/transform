export function removeIndentBlock(str: string): string;

export function getPreparedLeftContent({
    content,
    tagStartPos,
    tagContent
}: {
    content: string;
    tagStartPos: number,
    tagContent: string
}): string;
