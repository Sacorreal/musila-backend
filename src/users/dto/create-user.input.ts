import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {

  @Field()
  name: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field({ nullable: true })
  countryCode?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  typeCitizenID?: string;

  @Field({ nullable: true })
  citizenID?: string;

  @Field({ nullable: true })
  avatar?: string;
}
