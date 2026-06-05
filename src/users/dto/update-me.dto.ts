import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) secondName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) secondLastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) biography?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  countryCode?: string;
}
