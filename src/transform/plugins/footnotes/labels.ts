import type {Lang} from '../../shared-types';

// Visible backlink text remains usable without CSS, hover, or an icon font.
const labels: Record<Lang, string> = {
    ru: 'Назад к ссылке',
    en: 'Back to reference',
    ar: 'العودة إلى المرجع',
    cs: 'Zpět na odkaz',
    fr: 'Retour à la référence',
    es: 'Volver a la referencia',
    he: 'חזרה להפניה',
    bg: 'Обратно към препратката',
    et: 'Tagasi viite juurde',
    el: 'Επιστροφή στην παραπομπή',
    pt: 'Voltar à referência',
    zh: '返回引用',
    'zh-tw': '返回引用',
    kk: 'Сілтемеге оралу',
    tr: 'Referansa dön',
    uz: 'Havolaga qaytish',
};
export function backLabel(lang: Lang, caption: number, reference: number): string {
    const label = Object.prototype.hasOwnProperty.call(labels, lang) ? labels[lang] : labels.ru;
    return `${label} ${caption}:${reference}`;
}
