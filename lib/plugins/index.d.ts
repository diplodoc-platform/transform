export interface Plugins {
    notes: Function;
    anchors: Function;
    attrs: Function;
    code: Function;
    cut: Function;
    deflist: Function;
    images: Function;
    imsize: Function;
    includes: Function;
    links: Function;
    meta: Function;
    sup: Function;
    tabs: Function;
    video: Function;
}

declare let plugins: Plugins;

export default plugins;
