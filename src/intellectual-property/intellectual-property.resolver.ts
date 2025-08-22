import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { IntellectualPropertyService } from './intellectual-property.service';
import { IntellectualProperty } from './entities/intellectual-property.entity';
import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';

@Resolver(() => IntellectualProperty)
export class IntellectualPropertyResolver {
  constructor(private readonly intellectualPropertyService: IntellectualPropertyService) {}

  @Mutation(() => IntellectualProperty)
  createIntellectualProperty(@Args('createIntellectualPropertyInput') createIntellectualPropertyInput: CreateIntellectualPropertyInput) {
    return this.intellectualPropertyService.create(createIntellectualPropertyInput);
  }

  @Query(() => [IntellectualProperty], { name: 'intellectualProperty' })
  findAll() {
    return this.intellectualPropertyService.findAll();
  }

  @Query(() => IntellectualProperty, { name: 'intellectualProperty' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.intellectualPropertyService.findOne(id);
  }

  @Mutation(() => IntellectualProperty)
  updateIntellectualProperty(@Args('updateIntellectualPropertyInput') updateIntellectualPropertyInput: UpdateIntellectualPropertyInput) {
    return this.intellectualPropertyService.update(updateIntellectualPropertyInput.id, updateIntellectualPropertyInput);
  }

  @Mutation(() => IntellectualProperty)
  removeIntellectualProperty(@Args('id', { type: () => Int }) id: number) {
    return this.intellectualPropertyService.remove(id);
  }
}
