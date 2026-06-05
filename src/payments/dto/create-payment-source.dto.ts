import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * Datos de tarjeta para tokenización y creación de la fuente de pago.
 *
 * PCI DSS: estos datos se reenvían a Wompi y NUNCA se persisten en la base de
 * datos ni se escriben en logs.
 */
export class CreatePaymentSourceDto {
  @ApiProperty({ example: '4242424242424242' })
  @IsString()
  @Matches(/^[0-9]{12,19}$/, { message: 'Número de tarjeta inválido' })
  number: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Length(3, 4)
  cvc: string;

  @ApiProperty({ example: '08' })
  @IsString()
  @Length(2, 2)
  expMonth: string;

  @ApiProperty({ example: '28' })
  @IsString()
  @Length(2, 2)
  expYear: string;

  @ApiProperty({ example: 'JUAN PEREZ' })
  @IsString()
  @IsNotEmpty()
  cardHolder: string;

  @ApiProperty({ example: 'comprador@musila.com' })
  @IsEmail()
  customerEmail: string;
}
