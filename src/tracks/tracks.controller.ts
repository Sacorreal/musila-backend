import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { TracksService } from './tracks.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createTrackController(@Body() createTrackInput: CreateTrackInput, @UploadedFile() file: Express.Multer.File) {
    return await this.tracksService.createTrackService(createTrackInput, file);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAllTracksController(@CurrentUser([UserRole.ADMIN]) user: JwtPayload) {
    return await this.tracksService.findAllTracksService();
  }

  @Get(':id')
  async findOneTrackController(@Param('id') id: string) {
    return await this.tracksService.findOneTrackService(id);
  }

  @Put(':id')
  async updateTrackController(@Body() updateTrackInput: UpdateTrackInput, @Param('id') id: string,) {
    return await this.tracksService.updateTrackService(id, updateTrackInput);
  }

  @Delete(':id')
  async removeTrackController(@Param('id') id: string) {
    return await this.tracksService.removeTrackService(id);
  }
}
