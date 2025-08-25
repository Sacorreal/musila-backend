import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class CreatePlaylistInput {

  @Field()
  @IsString()
  title: string

  @Field(() => ID)
  @IsUUID()
  owner: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cover?: string

  @Field(() => [ID], { nullable: true })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  guestIds?: string[]

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  trackIds?: string[]

}
