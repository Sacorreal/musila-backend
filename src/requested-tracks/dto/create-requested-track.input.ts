import { InputType, Field, ID } from '@nestjs/graphql';
import { LicenseType } from '../entities/license-type.enum';

@InputType()
export class CreateRequestedTrackInput {
  
  @Field(() => ID)
  userId: string

  @Field(() => ID)
  trackId: string

  @Field(() => LicenseType)
  licenseType: LicenseType

  @Field(() => Boolean)
  approvedByRequester: boolean
}
