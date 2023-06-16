export interface ChangelogItem {
    title: string;
    image: {
        src: string;
        alt: string;
        ratio?: string;
    };
    description: string;
    [x: string]: unknown;
}
