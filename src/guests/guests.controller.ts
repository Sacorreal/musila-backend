import { GuestsService } from './guests.service';
import { CreateGuestInput } from './dto/create-guest.input';
import { UpdateGuestInput } from './dto/update-guest.input';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) { }


  @Post()
  async createGuestController(@Body() createGuestInput: CreateGuestInput) {
    return await this.guestsService.createGuestsService(createGuestInput);
  }

  @Get()
  async findAllGuestsController() {
    return await this.guestsService.findAllGuestsService();
  }

  @Get(':id')
  async findOneGuestController(@Param('id') id: string) {
    return await this.guestsService.findOneGuestsService(id);
  }

  @Put(':id')
  async updateGuestController(@Body() updateGuestInput: UpdateGuestInput, @Param('id') id: string) {
    return await this.guestsService.updateGuestsService(id, updateGuestInput);
  }

  @Delete(':id')
  async removeGuestController(@Param('id') id: string) {
    return await this.guestsService.removeGuestsService(id);
  }
}
