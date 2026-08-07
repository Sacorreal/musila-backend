import { PartialType } from '@nestjs/swagger';
import { CreatePublishingContractDto } from './create-publishing-contract.dto';

export class UpdatePublishingContractDto extends PartialType(CreatePublishingContractDto) {}
