import type {Lang} from '../typings';

export const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/g;
export const CUSTOM_ID_EXCEPTION = '[{#T}]';

export const ANCHOR_TITLES: Record<Lang, string> = {
    ru: 'Скопировать ссылку',
    en: 'Copy link',
    ar: 'انسخ الرابط',
    cs: 'Zkopírovat odkaz',
    fr: 'Copier le lien',
    es: 'Copiar enlace',
    he: 'העתק קישור',
    bg: 'Копиране на връзката',
    et: 'Kopeeri viide',
    el: 'Αντιγράψτε τον σύνδεσμο',
    pt: 'Copiar o link',
    zh: '复制链接',
    'zh-tw': '複製連結',
    kk: 'Сілтемені көшіру',
    tr: 'Bağlantıyı kopyala',
    uz: 'Havolani nusxalash',
};
