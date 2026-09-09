import { Injectable } from '@nestjs/common';
import { MfaMethod } from '../entities/mfa-method.enum';
import { StepUpSensitivity } from './step-up-sensitivity.enum';
import { STEP_UP_SCOPE_POLICIES } from './step-up-scope-policy.const';

export interface StepUpScopePolicy {
  sensitivity: StepUpSensitivity;
  allowedMethods: MfaMethod[];
  /** Si es `true`, el grant emitido se invalida tras la primera operación. */
  oneTimeUse: boolean;
}

/**
 * Resuelve la política de step-up de un scope (§15: "Passkey / TOTP según
 * política"). Fabricación pura: no conoce guards ni servicios de dominio.
 */
@Injectable()
export class StepUpPolicyService {
  resolve(scope: string): StepUpScopePolicy {
    const sensitivity =
      STEP_UP_SCOPE_POLICIES[scope] ?? StepUpSensitivity.STANDARD;
    const isCritical = sensitivity === StepUpSensitivity.CRITICAL;

    return {
      sensitivity,
      allowedMethods: isCritical
        ? [MfaMethod.PASSKEY]
        : [MfaMethod.PASSKEY, MfaMethod.TOTP],
      oneTimeUse: isCritical,
    };
  }
}
