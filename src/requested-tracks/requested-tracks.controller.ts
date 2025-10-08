
import { RequestedTracksService } from './requested-tracks.service';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LicenseType } from './entities/license-type.enum';

@ApiTags('Requested Tracks')
@Controller('requested-tracks')
export class RequestedTracksController {
  constructor(
    private readonly requestedTracksService: RequestedTracksService,
  ) { }


  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        requesterId: { type: 'string', format: 'uuid' },
        trackId: { type: 'string', format: 'uuid' },
        licenseType: {
          type: 'string',
          enum: Object.values(LicenseType)
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo opcional que se sube para el track'
        },
      },
      required: ['requesterId', 'trackId', 'licenseType'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async createRequestedTrackController(@Body() createRequestedTrackInput: CreateRequestedTrackInput, @UploadedFile() file?: Express.Multer.File) {
    return await this.requestedTracksService.createRequestedTracksService(createRequestedTrackInput, file);
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
