import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';
import { RegistrationFileParticipantRole } from '../entities/registration-file-participant-role.enum';
import { mapCoauthorRoleToParticipantRole } from './coauthor-role-mapper.util';

describe('mapCoauthorRoleToParticipantRole', () => {
  it('mapea cada rol de split a su equivalente legal del expediente', () => {
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.COMPOSITOR)).toBe(RegistrationFileParticipantRole.COMPOSITOR);
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.AUTOR)).toBe(RegistrationFileParticipantRole.AUTOR);
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.COMPOSITOR_AUTOR)).toBe(
      RegistrationFileParticipantRole.COMPOSITOR_AUTOR,
    );
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.ADAPTADOR)).toBe(RegistrationFileParticipantRole.ADAPTADOR);
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.ARREGLISTA)).toBe(RegistrationFileParticipantRole.ARREGLISTA);
  });

  it('aproxima TRADUCTOR a ADAPTADOR por no existir una categoría equivalente', () => {
    expect(mapCoauthorRoleToParticipantRole(CoauthorRole.TRADUCTOR)).toBe(RegistrationFileParticipantRole.ADAPTADOR);
  });
});
