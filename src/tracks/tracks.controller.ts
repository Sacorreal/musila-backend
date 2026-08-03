import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilterTrackDto } from './dto/filter-track.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

import { CurrentUser } from '../users/decorators/current-user.decorator';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UsersService } from 'src/users/users.service';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { TracksService } from './tracks.service';
import { ADMIN_PLAN_TYPES, UserPlanType, isAdminPlanType } from '../users/entities/user-plan-type.enum';

import { PaginatedTracksResponseDto, TrackResponseDto } from './dto/track-response.dto'
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { PlanLimit } from 'src/shared/plan-limits/plan-limit.decorator';
import { EmailVerifiedGuard } from 'src/users/guards/email-verified.guard';

@ApiTags('Tracks')
@UseGuards(JWTAuthGuard, PlansGuard)
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @AllowedPlans(...ADMIN_PLAN_TYPES, UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360)
  @UseGuards(EmailVerifiedGuard)
  @PlanLimit('tracks')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTrackInput })  
    @ApiOperation({
    summary: 'Crear nuevo track',
    description:
      'Crea un nuevo track en el sistema. Requiere subir el archivo de audio del track.',
  })
  @ApiResponse({
    status: 201,
    description: 'Track creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async createTrackController(
    @Body() createTrackInput: CreateTrackInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.tracksService.createTrackService(createTrackInput, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los tracks',
    description: 'Obtiene la lista de tracks con opciones de filtrado por género, autor, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Objeto con la lista de tracks y el total de registros',
    type: PaginatedTracksResponseDto, 
  })
  async findAllTracksController(
    @CurrentUser() user: JwtPayload,
    @Query() params: FilterTrackDto,
  ): Promise<PaginatedTracksResponseDto> { 
    return await this.tracksService.findAllTracksService({ params }, user);
  } 
  
  @Get('my-tracks')
  @AllowedPlans(UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360)
  @ApiOperation({
    summary: 'Obtener todos los tracks autoría del usuario logeado'
  })
  @ApiResponse({
    status: 200,
    description: 'Objeto con la lista de tracks y el total de registros',
    type: PaginatedTracksResponseDto, 
  })
  async findMytracks(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto
  ){
    return await this.tracksService.findMyTracksService(user, paginationDto)
  }

  /** Alias REST estándar: GET /tracks/me → mis tracks **/
  @Get('me')
  @ApiOperation({
    summary: 'Obtener tracks del usuario autenticado (alias de my-tracks)'
  })
  @ApiResponse({
    status: 200,
    description: 'Objeto con la lista de tracks y el total de registros',
    type: PaginatedTracksResponseDto,
  })
  async findMyTracksAlias(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.tracksService.findMyTracksService(user, paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un track por ID',
    description:
      'Obtiene la información detallada de un track específico por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del track obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pista musical no encontrada' })
  async findOneTrackController(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TrackResponseDto> {
    return await this.tracksService.findOneTrackService(id);
  }
  

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar track',
    description: 'Actualiza la información de un track existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track a actualizar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Track actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Track no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateTrackController(
    @Body() updateTrackInput: UpdateTrackInput,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const requesterId = isAdminPlanType(user.planType) ? undefined : user.id;
    return await this.tracksService.updateTrackService(id, updateTrackInput, requesterId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar track',
    description: 'Elimina un track del sistema por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track a eliminar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Track eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Track no encontrado' })
  async removeTrackController(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const requesterId = isAdminPlanType(user.planType) ? undefined : user.id;
    return await this.tracksService.removeTrackService(id, requesterId);
  }
}
