import { MusicRole } from '../entities/music-role.enum';

export const MUSIC_ROLE_LABELS: Record<MusicRole, string> = {
  [MusicRole.AGRUPACION]: 'Agrupación',
  [MusicRole.INTERPRETE]: 'Intérprete',
  [MusicRole.COMPOSITOR]: 'Compositor',
  [MusicRole.CANTAUTOR]: 'Cantautor',
  [MusicRole.PRODUCTOR]: 'Productor',
  [MusicRole.INGENIERO]: 'Ingeniero',
  [MusicRole.MANAGER]: 'Manager',
  [MusicRole.A_R]: 'A&R',
};
