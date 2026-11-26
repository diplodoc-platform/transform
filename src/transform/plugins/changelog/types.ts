export interface ChangelogItem {
    title: string;
    image?: {
        src: string;
        alt: string;
        ratio?: number;
    };
    description: string;
    [x: string]: unknown;
}
