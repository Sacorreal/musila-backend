import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';

export const ACCOUNT_TYPES = ['AHORROS', 'CORRIENTE'] as const;
export const DOCUMENT_TYPES = ['CC', 'CE', 'NIT'] as const;

export class CreateColombiaBankInformationDto {
  @ApiProperty({ required: false, description: 'Id del BankInformationRequest a marcar como completado, si aplica.' })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ description: 'Id del banco obtenido de GET /bank-information/transfer-options' })
  @IsNotEmpty()
  bankId: string;

  @ApiProperty({ description: 'Nombre del banco, resuelto desde la lista de opciones (para no re-consultar Wompi al mostrarlo).' })
  @IsNotEmpty()
  @MaxLength(255)
  bankName: string;

  @ApiProperty({ enum: ACCOUNT_TYPES })
  @IsIn(ACCOUNT_TYPES)
  accountType: (typeof ACCOUNT_TYPES)[number];

  @ApiProperty({ description: 'Número de cuenta (6-20 dígitos numéricos)' })
  @Matches(/^\d{6,20}$/, { message: 'El número de cuenta debe tener entre 6 y 20 dígitos numéricos' })
  accountNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(255)
  accountHolderName: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  accountHolderIdType: (typeof DOCUMENT_TYPES)[number];

  @ApiProperty()
  @Matches(/^[A-Za-z0-9-]{5,20}$/, { message: 'Número de documento inválido' })
  accountHolderIdNumber: string;
}
