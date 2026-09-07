import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSocietyAffiliationDto } from './create-society-affiliation.dto';
import { SocietyAffiliationRightsType } from '../entities/society-affiliation-rights-type.enum';

function buildDto(overrides: Partial<CreateSocietyAffiliationDto> = {}) {
  return plainToInstance(CreateSocietyAffiliationDto, {
    collectiveManagementSocietyId: '123e4567-e89b-12d3-a456-426614174000',
    rightsType: SocietyAffiliationRightsType.PR,
    territory: 'CO',
    ...overrides,
  });
}

describe('CreateSocietyAffiliationDto — validación de IPI Name Number', () => {
  it('acepta 12345678901 (11 dígitos)', async () => {
    const errors = await validate(buildDto({ ipiNameNumber: '12345678901' }));
    expect(errors).toHaveLength(0);
  });

  it('rechaza un IPI con menos de 11 dígitos', async () => {
    const errors = await validate(buildDto({ ipiNameNumber: '123' }));
    expect(errors.some((e) => e.property === 'ipiNameNumber')).toBe(true);
  });

  it('rechaza un IPI con caracteres no numéricos', async () => {
    const errors = await validate(buildDto({ ipiNameNumber: 'abc12345678' }));
    expect(errors.some((e) => e.property === 'ipiNameNumber')).toBe(true);
  });

  it('rechaza un territorio que no es ISO 3166-1 alpha-2', async () => {
    const errors = await validate(buildDto({ territory: 'COL' }));
    expect(errors.some((e) => e.property === 'territory')).toBe(true);
  });
});
