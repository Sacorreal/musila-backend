
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';


export class CreatePlaylistInput {

  @ApiProperty({ example: '', description: '' })
  @IsString()
  title: string

  @ApiProperty({ example: '', description: '' })
  @IsUUID()
  owner: string

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString()
  cover?: string

  @ApiProperty({ example: '', description: '' })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  guestIds?: string[]

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  trackIds?: string[]

}
