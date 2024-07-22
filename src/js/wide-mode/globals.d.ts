export {};

type Template = {
    label(name?: string);
    content(target?: Element);
};

declare global {
    interface Window {
        wideTemplate?: HTMLDivElement & Template;
    }
}
