import Token from 'markdown-it/lib/token';
export declare type Heading = {
    title: string;
    href: string;
    level: number;
    items?: Heading[];
};
export default function getHeadings(tokens: Token[]): Heading[];
