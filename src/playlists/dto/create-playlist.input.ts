
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';


export class CreatePlaylistInput {

  @IsString()
  title: string

  @IsUUID()
  owner: string

  @IsOptional()
  @IsString()
  cover?: string

  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  guestIds?: string[]

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  trackIds?: string[]

}
