// Tras normalize('NFD'), los acentos quedan como marcas diacríticas combinantes
// separadas (rango Unicode U+0300–U+036F) que se eliminan para dejar el carácter base.
const COMBINING_DIACRITICS_REGEX = /[̀-ͯ]/g;

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
