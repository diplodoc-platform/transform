export interface ChangelogItem {
    title: string;
    image: {
        src: string;
        alt: string;
        ratio?: string;
    };
    description: string;
    date: string;
    [x: string]: unknown;
}
