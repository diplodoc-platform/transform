import {
    Checkbox,
    CheckboxOptions, ExtensionAuto, ImgSize,
    ImgSizeOptions, Monospace, Video, VideoOptions,
    YfmCut,
    YfmCutOptions, YfmDist,
    YfmFile, YfmHeading, YfmHeadingOptions,
    YfmNote, YfmNoteOptions, YfmTable,
    YfmTableOptions, YfmTabs
} from "@doc-tools/yfm-editor";

export type YfmPresetOptions = {
    checkbox?: CheckboxOptions;
    video?: VideoOptions;
    imgSize?: ImgSizeOptions;
    yfmCut?: YfmCutOptions;
    yfmNote?: YfmNoteOptions;
    yfmTable?: YfmTableOptions;
    yfmHeading?: YfmHeadingOptions;
};

export const YfmPreset: ExtensionAuto<YfmPresetOptions> = (builder, opts) => {
    builder
        .use(Checkbox, opts.checkbox ?? {})
        .use(ImgSize, opts.imgSize ?? {})
        .use(Monospace)
        .use(Video, opts.video ?? {})
        .use(YfmDist)
        .use(YfmCut, opts.yfmCut ?? {})
        .use(YfmNote, opts.yfmNote ?? {})
        .use(YfmFile)
        .use(YfmHeading, opts.yfmHeading ?? {})
        .use(YfmTable, opts.yfmTable ?? {})
        .use(YfmTabs);
};