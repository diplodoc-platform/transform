import Token from 'markdown-it/lib/token';
export default function extractTitle(tokens: Token[]): {
    titleTokens: Token[];
    title: string;
    tokens: Token[];
};
