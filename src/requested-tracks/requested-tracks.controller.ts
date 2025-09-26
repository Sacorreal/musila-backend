
import { RequestedTracksService } from './requested-tracks.service';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Requested Tracks')
@Controller('requested-tracks')
export class RequestedTracksController {
  constructor(
    private readonly requestedTracksService: RequestedTracksService,
  ) { }


  @Post()
  async createRequestedTrackController(@Body() createRequestedTrackInput: CreateRequestedTrackInput) {
    return await this.requestedTracksService.createRequestedTracksService(createRequestedTrackInput);
  }

  @Get()
  async findAllRequestedTrackController() {
    return await this.requestedTracksService.findAllRequestedTracksService();
  }

  @Get(':id')
  async findOneRequestedTrackController(@Param('id') id: string) {
    return await this.requestedTracksService.findOneRequestedTracksService(id);
  }

  @Put(':id')
  async updateRequestedTrackController(@Body() updateRequestedTrackInput: UpdateRequestedTrackInput, @Param('id') id: string) {
    return await this.requestedTracksService.updateRequestedTracksService(id, updateRequestedTrackInput);
  }


  @Delete(':id')
  removeRequestedTrackController(@Param('id') id: string) {
    return this.requestedTracksService.removeRequestedTracksService(id);
  }
}
