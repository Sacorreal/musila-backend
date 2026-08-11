import { SetMetadata } from '@nestjs/common';

export const REQUIRE_STEP_UP_KEY = 'require_step_up';

/**
 * Declara que un endpoint exige una autorización de step-up vigente para el
 * `scope` indicado (§15). Debe combinarse con `JWTAuthGuard` y `StepUpGuard`:
 *
 *   @UseGuards(JWTAuthGuard, StepUpGuard)
 *   @RequireStepUp('account.change_password')
 *   @Patch('password')
 *   changePassword() { ... }
 *
 * NOTA (fase actual): la infraestructura queda lista pero no se aplica todavía
 * a endpoints existentes; su cableado a operaciones sensibles reales es una
 * fase posterior.
 */
export const RequireStepUp = (scope: string) =>
  SetMetadata(REQUIRE_STEP_UP_KEY, scope);
