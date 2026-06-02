import { SetMetadata } from '@nestjs/common';
import { PlanResource } from './plan-limits.config';

export { PlanResource };
export const PLAN_LIMIT_KEY = 'plan_limit_resource';

export const PlanLimit = (resource: PlanResource) => SetMetadata(PLAN_LIMIT_KEY, resource);
