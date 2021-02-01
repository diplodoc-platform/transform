export default function liquid(
    originInput: string,
    vars: Record<string, string>,
    path: string,
    settings?: {
        conditions?: boolean;
        conditionsInCode?: boolean;
        cycle?: boolean;
        substitutions?: boolean;
    }
): string;
