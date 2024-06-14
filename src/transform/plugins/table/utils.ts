/**
 * Parse the markdown-attrs format to retrieve a class name
 * Putting all the requirements in regex was more complicated than parsing a string char by char.
 *
 * @param {string} inputString - The string to parse.
 * @returns {string|null} - The extracted class or null if there is none
 */

export function parseAttrsClass(inputString: string): string | null {
    const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .=-_';

    if (!inputString.startsWith('{')) {
        return null;
    }

    for (let i = 1; i < inputString.length; i++) {
        const char = inputString[i];

        if (char === '}') {
            const contentInside = inputString.slice(1, i).trim(); // content excluding { and }

            if (!contentInside) {
                return null;
            }

            const parts = contentInside.split('.');
            if (parts.length !== 2 || !parts[1]) {
                return null;
            }
            //There should be a preceding whitespace
            if (!parts[0].endsWith(' ') && parts[0] !== '') {
                return null;
            }

            return parts[1];
        }

        if (!validChars.includes(char)) {
            return null;
        }
    }

    return null;
}
