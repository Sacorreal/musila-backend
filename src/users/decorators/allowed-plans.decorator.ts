import { SetMetadata } from "@nestjs/common";
import { UserPlanType } from "src/users/entities/user-plan-type.enum";


export const ALLOWED_PLANS_KEY = 'allowedPlans';
export const AllowedPlans = (...plans: UserPlanType[]) => SetMetadata(ALLOWED_PLANS_KEY, plans)
