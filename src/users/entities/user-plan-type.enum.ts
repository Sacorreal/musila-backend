export enum UserPlanType {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  PLAN_AUTOR = 'plan_autor',
  PLAN_360 = 'plan_360',
  PLAN_DESCUBRIDOR = 'plan_descubridor',
  INVITADO = 'invitado',
  EDITOR = 'editor',
}

/** Planes con privilegios administrativos: superadmin hereda todo lo que tiene admin. */
export const ADMIN_PLAN_TYPES: UserPlanType[] = [
  UserPlanType.SUPERADMIN,
  UserPlanType.ADMIN,
];

export const isAdminPlanType = (planType: UserPlanType): boolean =>
  ADMIN_PLAN_TYPES.includes(planType);
