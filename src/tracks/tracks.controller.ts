import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilterTrackDto } from './dto/filter-track.dto';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UsersService } from 'src/users/users.service';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { TracksService } from './tracks.service';

@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly usersService: UsersService,
  ) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTrackInput })
  @Post()
  @UseInterceptors(FileInterceptor('file_track'))
  async createTrackController(
    @Body() createTrackInput: CreateTrackInput,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.tracksService.createTrackService(createTrackInput, file);
  }

  @Get()
  async findAllTracksController(
    //@CurrentUser() user: JwtPayload,
    @Query() params: FilterTrackDto,
  ) {
    return await this.tracksService.findAllTracksService({ params });
  }

  @Get('my-tracks')
  async findMyTracksController(@CurrentUser() user: JwtPayload) {
    return this.tracksService.findAllTracksService({ user });
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('by-preferred-genres')
  async getTracksByPreferredGenresController(
    @CurrentUser() payload: JwtPayload,
  ) {
    const user = await this.usersService.findOneUserService(payload.id);

    return this.tracksService.findTracksByUserPreferredGenresService(user);
  }

  @Get(':id')
  async findOneTrackController(@Param('id') id: string) {
    return await this.tracksService.findOneTrackService(id);
  }

  @Put(':id')
  async updateTrackController(
    @Body() updateTrackInput: UpdateTrackInput,
    @Param('id') id: string,
  ) {
    return await this.tracksService.updateTrackService(id, updateTrackInput);
  }

  @Delete(':id')
  async removeTrackController(@Param('id') id: string) {
    return await this.tracksService.removeTrackService(id);
  }
}
