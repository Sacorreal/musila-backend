import { ApiProperty } from '@nestjs/swagger';
import { BankInformationMethod } from '../entities/bank-information-method.enum';

class ColombiaBankInformationPayload {
  bankId: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName: string;
  accountHolderIdType: string;
  accountHolderIdNumber: string;
}

class ForeignBankInformationPayload {
  countryCallingCode: string;
  phoneNumber: string;
  email: string;
  global66Username: string;
}

export class BankInformationResponseDto {
  @ApiProperty({ enum: BankInformationMethod })
  method: BankInformationMethod;

  @ApiProperty({ description: 'Payload descifrado, forma según `method`.' })
  data: ColombiaBankInformationPayload | ForeignBankInformationPayload;

  @ApiProperty({ required: false, nullable: true })
  legalNoticeAcceptedAt: Date | null;

  @ApiProperty()
  updatedAt: Date;
}

export class PendingBankInformationStatusDto {
  @ApiProperty()
  pending: boolean;

  @ApiProperty({ required: false, nullable: true })
  request?: {
    requestId: string;
    contractId: string;
    trackTitle: string;
    advanceAmount: number;
  } | null;
}
