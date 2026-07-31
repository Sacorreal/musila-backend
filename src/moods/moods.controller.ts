import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateMoodInput } from './dto/create-mood.input';
import { UpdateMoodInput } from './dto/update-mood.input';
import { MoodsService } from './moods.service';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { PaginatedMoodResponseDto } from './dto/mood-pagination.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlansGuard } from '../users/guards/plans.guard';
import { AllowedPlans } from '../users/decorators/allowed-plans.decorator';
import { UserPlanType } from '../users/entities/user-plan-type.enum';

@ApiTags('Moods')
@Controller('moods')
export class MoodsController {
  constructor(private readonly moodsService: MoodsService) {}

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo mood',
    description: 'Crea un nuevo mood en el catálogo. Requiere rol de administrador.',
  })
  @ApiResponse({ status: 201, description: 'Mood creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createMoodController(@Body() createMoodInput: CreateMoodInput) {
    return await this.moodsService.createMoodService(createMoodInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los moods',
    description: 'Obtiene la lista completa de moods disponibles en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de moods obtenida exitosamente',
    type: PaginatedMoodResponseDto,
  })
  async findAllMoodController(@Query() paginationDto: PaginationDto) {
    return await this.moodsService.findAllMoodService(paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un mood por ID',
    description: 'Obtiene la información detallada de un mood específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del mood (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Información del mood obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Mood no encontrado' })
  async findOneMoodController(@Param('id') id: string) {
    return await this.moodsService.findOneMoodService(id);
  }

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar mood',
    description: 'Actualiza la información de un mood existente. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del mood a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Mood actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Mood no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateMoodController(
    @Body() updateMoodInput: UpdateMoodInput,
    @Param('id') id: string,
  ) {
    return await this.moodsService.updateMoodService(id, updateMoodInput);
  }

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar mood',
    description: 'Elimina un mood del sistema por su ID. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del mood a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Mood eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Mood no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async removeMoodController(@Param('id') id: string) {
    return await this.moodsService.removeMoodService(id);
  }
}
