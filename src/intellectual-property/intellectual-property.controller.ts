import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';
import { IntellectualPropertyService } from './intellectual-property.service';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

@Controller('intellectual-property')
export class IntellectualPropertyController {
  constructor(
    private readonly intellectualPropertyService: IntellectualPropertyService,
  ) { }

  @Post()
  createIntellectualPropertyController(@Body() createIntellectualPropertyInput: CreateIntellectualPropertyInput) {
    return this.intellectualPropertyService.create(createIntellectualPropertyInput);
  }

  @Get()
  findAllIntellectualProperty() {
    return this.intellectualPropertyService.findAll();
  }

  @Get(':id')
  findOneIntellectualProperty(@Param('id') id: string) {
    return this.intellectualPropertyService.findOne(id);
  }

  @Put(':id')
  updateIntellectualProperty(@Body() updateIntellectualPropertyInput: UpdateIntellectualPropertyInput, @Param('id') id: string) {
    return this.intellectualPropertyService.update(id, updateIntellectualPropertyInput,
    );
  }

  @Delete(':id')
  removeIntellectualProperty(@Param('id') id: string) {
    return this.intellectualPropertyService.remove(id);
  }
}
