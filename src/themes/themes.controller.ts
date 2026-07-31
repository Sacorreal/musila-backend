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
import { CreateThemeInput } from './dto/create-theme.input';
import { UpdateThemeInput } from './dto/update-theme.input';
import { ThemesService } from './themes.service';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { PaginatedThemeResponseDto } from './dto/theme-pagination.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlansGuard } from '../users/guards/plans.guard';
import { AllowedPlans } from '../users/decorators/allowed-plans.decorator';
import { UserPlanType } from '../users/entities/user-plan-type.enum';

@ApiTags('Temas')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo tema',
    description: 'Crea un nuevo tema/uso en el catálogo. Requiere rol de administrador.',
  })
  @ApiResponse({ status: 201, description: 'Tema creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createThemeController(@Body() createThemeInput: CreateThemeInput) {
    return await this.themesService.createThemeService(createThemeInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los temas',
    description: 'Obtiene la lista completa de temas disponibles en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de temas obtenida exitosamente',
    type: PaginatedThemeResponseDto,
  })
  async findAllThemeController(@Query() paginationDto: PaginationDto) {
    return await this.themesService.findAllThemeService(paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un tema por ID',
    description: 'Obtiene la información detallada de un tema específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del tema (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Información del tema obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  async findOneThemeController(@Param('id') id: string) {
    return await this.themesService.findOneThemeService(id);
  }

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar tema',
    description: 'Actualiza la información de un tema existente. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del tema a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Tema actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateThemeController(
    @Body() updateThemeInput: UpdateThemeInput,
    @Param('id') id: string,
  ) {
    return await this.themesService.updateThemeService(id, updateThemeInput);
  }

  @AllowedPlans(UserPlanType.ADMIN)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar tema',
    description: 'Elimina un tema del sistema por su ID. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del tema a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Tema eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async removeThemeController(@Param('id') id: string) {
    return await this.themesService.removeThemeService(id);
  }
}
