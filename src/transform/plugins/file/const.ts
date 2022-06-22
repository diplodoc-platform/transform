export enum FileSpecialAttr {
    Src = 'src',
    Name = 'name',
    Lang = 'lang',
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attributes
export enum LinkHtmlAttr {
    Download = 'download',
    Href = 'href',
    HrefLang = 'hreflang',
    Media = 'media',
    Ping = 'ping',
    ReferrerPolicy = 'referrerpolicy',
    Rel = 'rel',
    Target = 'target',
    Type = 'type',
}

export const FILE_TO_LINK_ATTRS_MAP: Record<FileSpecialAttr, LinkHtmlAttr> = {
    [FileSpecialAttr.Src]: LinkHtmlAttr.Href,
    [FileSpecialAttr.Name]: LinkHtmlAttr.Download,
    [FileSpecialAttr.Lang]: LinkHtmlAttr.HrefLang,
};

export const RULE_NAME = 'yfm_file_inline';
export const KNOWN_ATTRS: readonly string[] = [
    FileSpecialAttr.Src,
    FileSpecialAttr.Name,
    FileSpecialAttr.Lang,
    LinkHtmlAttr.ReferrerPolicy,
    LinkHtmlAttr.Rel,
    LinkHtmlAttr.Target,
    LinkHtmlAttr.Type,
];
export const REQUIRED_ATTRS: readonly string[] = [FileSpecialAttr.Src, FileSpecialAttr.Name];

export const FILE_TOKEN = 'yfm_file';

export const PREFIX = '{% file ';
export const PREFIX_LENGTH = PREFIX.length;

export enum FileClassName {
    Link = 'yfm-file',
    Icon = 'yfm-file__icon',
}
