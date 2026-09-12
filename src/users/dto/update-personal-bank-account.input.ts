import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ACCOUNT_TYPES } from 'src/bank-information/dto/create-colombia-bank-information.dto';

/**
 * A diferencia de `BankAccountInput` (usado por el wallet de organización,
 * donde el titular es la razón social/NIT), aquí NO se piden titular/tipo de
 * documento/número de documento: para una cuenta personal esos datos ya
 * viven en la identidad legal del usuario (`LegalIdentityService`) y
 * `MeService.updateBankAccount` los deriva de ahí — pedirlos de nuevo sería
 * duplicar un dato que además podría quedar desincronizado del original.
 */
export class UpdatePersonalBankAccountInput {
  @ApiProperty({ description: 'Id/código del banco obtenido de GET /bank-information/transfer-options' })
  @IsString()
  @IsNotEmpty({ message: 'El banco es obligatorio' })
  bankCode: string;

  @ApiProperty({ example: 'Bancolombia', description: 'Nombre del banco, resuelto desde la misma lista de opciones' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del banco es obligatorio' })
  bankName: string;

  @ApiProperty({ enum: ACCOUNT_TYPES })
  @IsIn(ACCOUNT_TYPES, { message: 'El tipo de cuenta es obligatorio' })
  accountType: (typeof ACCOUNT_TYPES)[number];

  @ApiProperty({ example: '00000000000' })
  @IsString()
  @IsNotEmpty({ message: 'El número de cuenta es obligatorio' })
  accountNumber: string;
}
