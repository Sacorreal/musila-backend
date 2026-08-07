import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';
import { RegistrationFileParticipantRole } from '../entities/registration-file-participant-role.enum';

/**
 * Mapea el rol de reparto de regalías (`CoauthorRole`, usado por `splits`) al
 * rol legal de declaración del expediente (`RegistrationFileParticipantRole`).
 * `TRADUCTOR` no tiene categoría equivalente en el formulario SAYCO/DNDA —
 * se aproxima a `ADAPTADOR` (documentado aquí, no una elección arbitraria en
 * cada call site).
 */
const COAUTHOR_ROLE_TO_PARTICIPANT_ROLE: Record<CoauthorRole, RegistrationFileParticipantRole> = {
  [CoauthorRole.COMPOSITOR]: RegistrationFileParticipantRole.COMPOSITOR,
  [CoauthorRole.AUTOR]: RegistrationFileParticipantRole.AUTOR,
  [CoauthorRole.COMPOSITOR_AUTOR]: RegistrationFileParticipantRole.COMPOSITOR_AUTOR,
  [CoauthorRole.ADAPTADOR]: RegistrationFileParticipantRole.ADAPTADOR,
  [CoauthorRole.ARREGLISTA]: RegistrationFileParticipantRole.ARREGLISTA,
  [CoauthorRole.TRADUCTOR]: RegistrationFileParticipantRole.ADAPTADOR,
};

export function mapCoauthorRoleToParticipantRole(role: CoauthorRole): RegistrationFileParticipantRole {
  return COAUTHOR_ROLE_TO_PARTICIPANT_ROLE[role];
}
