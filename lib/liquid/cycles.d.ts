export declare type Tag = {
    item: string;
    variableName: string;
    collectionName: string;
    startPos: number;
    forRaw: string;
};
export default function cycles(originInput: string, vars: Record<string, unknown>, path?: string, settings?: {
    sourceMap?: Record<number, number>;
}): string;
