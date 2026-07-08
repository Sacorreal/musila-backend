import { AffiliateTier } from '../entities/affiliate-tier.enum';
import { AffiliateStatus } from '../entities/affiliate-status.enum';

export interface AffiliateJwtPayload {
  id: string;
  email: string;
  name: string;
  tier: AffiliateTier;
  status: AffiliateStatus;
  type: 'affiliate';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAffiliateRequest extends Request {
  affiliate?: AffiliateJwtPayload;
}
