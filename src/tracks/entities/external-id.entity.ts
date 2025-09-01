import { Field, ObjectType } from "@nestjs/graphql";


@ObjectType()
export class ExternalId {
  @Field()
  type: string;

  @Field()
  value: string;
}