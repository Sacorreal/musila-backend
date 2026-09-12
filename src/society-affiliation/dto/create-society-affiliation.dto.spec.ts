import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSocietyAffiliationDto } from './create-society-affiliation.dto';
import { SocietyAffiliationRightsType } from '../entities/society-affiliation-rights-type.enum';
import { SocietyAffiliationTerritoryMode } from '../entities/society-affiliation-territory-mode.enum';

function buildDto(overrides: Partial<CreateSocietyAffiliationDto> = {}) {
  return plainToInstance(CreateSocietyAffiliationDto, {
    collectiveManagementSocietyId: '123e4567-e89b-12d3-a456-426614174000',
    rightsType: SocietyAffiliationRightsType.PR,
    territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES,
    territoryCountries: ['CO'],
    ipiNameNumber: '12345678901',
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

  it('rechaza un DTO sin IPI Name Number (ahora obligatorio)', async () => {
    const errors = await validate(buildDto({ ipiNameNumber: undefined }));
    expect(errors.some((e) => e.property === 'ipiNameNumber')).toBe(true);
  });
});

describe('CreateSocietyAffiliationDto — validación de territorio', () => {
  it('rechaza un país que no es ISO 3166-1 alpha-2', async () => {
    const errors = await validate(buildDto({ territoryCountries: ['COL'] }));
    expect(errors.some((e) => e.property === 'territoryCountries')).toBe(true);
  });

  it('acepta WORLDWIDE sin territoryCountries', async () => {
    const errors = await validate(buildDto({ territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE, territoryCountries: undefined }));
    expect(errors).toHaveLength(0);
  });

  it('acepta WORLDWIDE_EXCEPT con países excluidos válidos', async () => {
    const errors = await validate(
      buildDto({ territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE_EXCEPT, territoryCountries: ['US'] }),
    );
    expect(errors).toHaveLength(0);
  });
});
