interface Output {
    html: string;
    title: string;
    headings: any[];
    assets: any[];
    meta: object;
}

interface Options {
    [key: string]: any;
}

export default function transform(input: string, options?: Options): Output;
