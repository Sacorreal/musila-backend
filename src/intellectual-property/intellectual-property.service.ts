import { Injectable } from '@nestjs/common';
import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';
import { PaginationDto} from '../shared/dto/pagination.dto';

@Injectable()
export class IntellectualPropertyService {
  create(_createIntellectualPropertyInput: CreateIntellectualPropertyInput) {
    return 'This action adds a new intellectualProperty';
  }

  findAll(_paginationDto: PaginationDto) {
    return { data: [], total: 0 };
  }

  findOne(id: string) {
    return `This action returns a #${id} intellectualProperty`;
  }

  update(
    id: string,
    _updateIntellectualPropertyInput: UpdateIntellectualPropertyInput,
  ) {
    return `This action updates a #${id} intellectualProperty`;
  }

  remove(id: string) {
    return `This action removes a #${id} intellectualProperty`;
  }
}
