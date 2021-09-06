export default function liquid(
    originInput: string,
    vars: Record<string, unknown>,
    path: string,
    settings?: {
        conditions?: boolean;
        conditionsInCode?: boolean;
        cycle?: boolean;
        substitutions?: boolean;
    }
): string;

export default function liquid(
    originInput: string,
    vars: Record<string, unknown>,
    path: string,
    settings?: {
        conditions?: boolean;
        conditionsInCode?: boolean;
        cycle?: boolean;
        substitutions?: boolean;
        withSourceMap: boolean;
    }
): {output: string; sourceMap: object};
