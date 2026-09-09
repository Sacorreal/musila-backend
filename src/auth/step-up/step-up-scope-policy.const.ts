import { StepUpSensitivity } from './step-up-sensitivity.enum';

/**
 * Sensibilidad declarada de cada scope de step-up (§15). Fuente única de
 * verdad: nunca ramificar por scope con `if`/`switch` fuera de este mapa.
 * Scopes de Admin Musila (`platform.*` administrativos) son CRITICAL: solo
 * Passkey, grant de un solo uso. El resto es STANDARD: Passkey o TOTP, grant
 * reutilizable durante toda la ventana de vigencia.
 */
export const STEP_UP_SCOPE_POLICIES: Record<string, StepUpSensitivity> = {
  // Cuenta
  'account.change_password': StepUpSensitivity.STANDARD,
  'account.change_email': StepUpSensitivity.STANDARD,
  'account.mfa.disable': StepUpSensitivity.STANDARD,
  'account.passkey.revoke': StepUpSensitivity.STANDARD,
  'account.delete': StepUpSensitivity.STANDARD,

  // B2B
  'organization.members.invite': StepUpSensitivity.STANDARD,
  'organization.members.roles.update': StepUpSensitivity.STANDARD,
  'organization.roles.capabilities.update': StepUpSensitivity.STANDARD,
  'organization.security_policy.update': StepUpSensitivity.STANDARD,

  // Marketplace
  'marketplace.purchase.confirm': StepUpSensitivity.STANDARD,

  // Finanzas
  'account.bank_account.update': StepUpSensitivity.STANDARD,
  'account.billing.update': StepUpSensitivity.STANDARD,
  'account.payment_method.manage': StepUpSensitivity.STANDARD,
  'wallet.withdrawal.approve': StepUpSensitivity.STANDARD,

  // Admin Musila
  'platform.admin.create': StepUpSensitivity.CRITICAL,
  'platform.staff.assign_role': StepUpSensitivity.CRITICAL,
  'platform.staff.roles.update': StepUpSensitivity.CRITICAL,
  'platform.capabilities.update': StepUpSensitivity.CRITICAL,
  'platform.plans.transaction_fee.update': StepUpSensitivity.CRITICAL,
  'platform.promotions.pricing.update': StepUpSensitivity.CRITICAL,
};
