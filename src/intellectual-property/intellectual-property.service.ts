import { Injectable } from '@nestjs/common';
import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';

@Injectable()
export class IntellectualPropertyService {
  create(createIntellectualPropertyInput: CreateIntellectualPropertyInput) {
    return 'This action adds a new intellectualProperty';
  }

  findAll() {
    return `This action returns all intellectualProperty`;
  }

  findOne(id: string) {
    return `This action returns a #${id} intellectualProperty`;
  }

  update(
    id: string,
    updateIntellectualPropertyInput: UpdateIntellectualPropertyInput,
  ) {
    return `This action updates a #${id} intellectualProperty`;
  }

  remove(id: string) {
    return `This action removes a #${id} intellectualProperty`;
  }
}
