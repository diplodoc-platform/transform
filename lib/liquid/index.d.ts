export default function liquid(
    originInput: string,
    vars: Record<string, string>,
    path: string,
    settings?: {
        conditions?: boolean;
        substitutions?: boolean;
    }
): string;
