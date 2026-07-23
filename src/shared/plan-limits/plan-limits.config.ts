import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';

export type PlanResource = 'tracks' | 'requests' | 'collaborators' | 'playlists';

/** null = ilimitado */
type LimitMap = Partial<Record<PlanResource, number | null>>;

export const PLAN_LIMITS: Partial<Record<UserPlanType, Record<UserPlan, LimitMap>>> = {
  [UserPlanType.PLAN_AUTOR]: {
    [UserPlan.FREE]: { tracks: 5 },
    [UserPlan.PRO]: { tracks: null },
  },
  [UserPlanType.PLAN_360]: {
    [UserPlan.FREE]: { tracks: 5, requests: 3, collaborators: 2, playlists: 1 },
    [UserPlan.PRO]: { tracks: null, requests: null, collaborators: 5, playlists: null },
  },
  [UserPlanType.PLAN_DESCUBRIDOR]: {
    [UserPlan.FREE]: { requests: 5, collaborators: 2, playlists: 1 },
    [UserPlan.PRO]: { requests: null, collaborators: 5, playlists: null },
  },
};

export function getLimit(planType: UserPlanType, plan: UserPlan, resource: PlanResource): number | null | undefined {
  return PLAN_LIMITS[planType]?.[plan]?.[resource];
}
