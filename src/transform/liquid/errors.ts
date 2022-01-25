import {bold} from 'chalk';

export class SkippedEvalError extends Error {
    constructor(message: string, exp: string) {
        super();

        this.name = 'SkippedEvalError';
        this.message = `${message}: ${bold(exp)}`;
    }
}
