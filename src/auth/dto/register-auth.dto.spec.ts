import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterAuthDto } from './register-auth.dto';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { MusicRole } from 'src/users/entities/music-role.enum';

function baseDto(overrides: Partial<RegisterAuthDto> = {}) {
  return plainToInstance(RegisterAuthDto, {
    name: 'Sofía',
    lastName: 'Pérez',
    email: 'sofi@example.com',
    password: '123456',
    repeatPassword: '123456',
    countryCode: '+57',
    phone: '3000000000',
    typeCitizenID: 'CC',
    citizenID: '12345678',
    planType: UserPlanType.PLAN_AUTOR,
    role: MusicRole.COMPOSITOR,
    ...overrides,
  });
}

describe('RegisterAuthDto', () => {
  it('es válido con un role (MusicRole) presente', async () => {
    // No validamos el DTO completo: @IsValidEmail hace un lookup MX real por
    // red, fuera del alcance de este test. Solo nos interesa el campo `role`.
    const errors = await validate(baseDto());
    expect(errors.some((e) => e.property === 'role')).toBe(false);
  });

  it('falla si falta el campo role (MusicRole)', async () => {
    const dto = baseDto();
    (dto as any).role = undefined;
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('falla si role tiene un valor fuera del enum MusicRole', async () => {
    const dto = baseDto({ role: 'inexistente' as MusicRole });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('falla si planType no es uno de los planes públicos de registro', async () => {
    const dto = baseDto({ planType: UserPlanType.ADMIN as any });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'planType')).toBe(true);
  });
});
