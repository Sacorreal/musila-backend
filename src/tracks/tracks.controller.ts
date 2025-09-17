import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { TracksService } from './tracks.service';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) { }

  @Post()
  async createTrackController(@Body() createTrackInput: CreateTrackInput) {
    return await this.tracksService.createTrackService(createTrackInput);
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
