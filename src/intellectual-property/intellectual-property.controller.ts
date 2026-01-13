import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';
import { IntellectualPropertyService } from './intellectual-property.service';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

@ApiTags('Propiedad Intelectual')
@Controller('intellectual-property')
export class IntellectualPropertyController {
  constructor(
    private readonly intellectualPropertyService: IntellectualPropertyService,
  ) { }

  @Post()
  @ApiOperation({
    summary: 'Crear registro de propiedad intelectual',
    description: 'Crea un nuevo registro de propiedad intelectual en el sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registro de propiedad intelectual creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createIntellectualPropertyController(@Body() createIntellectualPropertyInput: CreateIntellectualPropertyInput) {
    return this.intellectualPropertyService.create(createIntellectualPropertyInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los registros de propiedad intelectual',
    description: 'Obtiene la lista completa de registros de propiedad intelectual en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros obtenida exitosamente',
  })
  findAllIntellectualProperty() {
    return this.intellectualPropertyService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un registro de propiedad intelectual por ID',
    description: 'Obtiene la información detallada de un registro de propiedad intelectual específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del registro de propiedad intelectual (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del registro obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOneIntellectualProperty(@Param('id') id: string) {
    return this.intellectualPropertyService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar registro de propiedad intelectual',
    description: 'Actualiza la información de un registro de propiedad intelectual existente.',
  })
  @ApiParam({ name: 'id', description: 'ID del registro de propiedad intelectual a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Registro de propiedad intelectual actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  updateIntellectualProperty(@Body() updateIntellectualPropertyInput: UpdateIntellectualPropertyInput, @Param('id') id: string) {
    return this.intellectualPropertyService.update(id, updateIntellectualPropertyInput,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar registro de propiedad intelectual',
    description: 'Elimina un registro de propiedad intelectual del sistema por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del registro de propiedad intelectual a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Registro de propiedad intelectual eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  removeIntellectualProperty(@Param('id') id: string) {
    return this.intellectualPropertyService.remove(id);
  }
}
