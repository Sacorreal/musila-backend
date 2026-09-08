/**
 * Filtro de género/ritmo snapshoteado al crear la campaña (§1 Creación de la
 * campaña). `ritmos: null` significa "todos los ritmos del género" — se
 * resuelve contra el catálogo vigente en el momento del match, mientras que
 * una lista explícita queda fija aunque el catálogo cambie después.
 */
export interface CampaignGenreFilter {
  genreId: string;
  genreName: string;
  ritmos: string[] | null;
}
