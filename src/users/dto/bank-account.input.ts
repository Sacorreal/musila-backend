import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BankAccountInput {
  @ApiProperty({ example: 'Bancolombia' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del banco es obligatorio' })
  bankName: string;

  @ApiProperty({ example: 'Ahorros' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de cuenta es obligatorio' })
  accountType: string;

  @ApiProperty({ example: '00000000000' })
  @IsString()
  @IsNotEmpty({ message: 'El número de cuenta es obligatorio' })
  accountNumber: string;

  @ApiProperty({ example: 'Sofía Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El titular de la cuenta es obligatorio' })
  accountHolderName: string;

  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento del titular es obligatorio' })
  accountHolderIdType: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento del titular es obligatorio' })
  accountHolderIdNumber: string;
}
