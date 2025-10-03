import type {Lang} from 'src/transform/typings';

export const INLINE_CODE = '.yfm-clipboard-inline-code';

export const INLINE_CODE_ID = 'tooltip_inline_clipboard_dialog';

export const INLINE_CODE_CLASS = 'yfm inline_code_tooltip';

export const OPEN_CLASS = 'open';

export const LANG_TOKEN: Record<Lang, string> = {
    ru: 'Скопировано',
    en: 'Copied',
    ar: 'تم النسخ',
    cs: 'Zkopírováno',
    fr: 'Copié',
    es: 'Copiado',
    he: 'הועתק',
    bg: 'Копирано',
    et: 'Kopeeritud',
    el: 'Αντιγράφηκε',
    pt: 'Copiado',
    zh: '已复制',
    'zh-tw': '已複製',
    kk: 'Көшірілді',
    tr: 'Kopyalandı',
    uz: 'Nusxalandi',
};
