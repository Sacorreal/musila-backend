import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { ADMIN_PLAN_TYPES, UserPlanType } from 'src/users/entities/user-plan-type.enum';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { PublishingContractsService } from './publishing-contracts.service';
import { CreatePublishingContractDto } from './dto/create-publishing-contract.dto';
import { UpdatePublishingContractDto } from './dto/update-publishing-contract.dto';

const AUTHOR_PLANS = [...ADMIN_PLAN_TYPES, UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360];

@ApiTags('Contratos Editoriales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...AUTHOR_PLANS)
@Controller('publishing-contracts')
export class PublishingContractsController {
  constructor(private readonly publishingContractsService: PublishingContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo contrato editorial' })
  @ApiResponse({ status: 201, description: 'Contrato editorial creado exitosamente' })
  create(@Body() dto: CreatePublishingContractDto, @CurrentUser() user: JwtPayload) {
    return this.publishingContractsService.create(dto, user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar los contratos editoriales del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de contratos editoriales' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.publishingContractsService.findMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contrato editorial por ID' })
  @ApiParam({ name: 'id', description: 'UUID del contrato editorial' })
  @ApiResponse({ status: 200, description: 'Contrato editorial encontrado' })
  @ApiResponse({ status: 404, description: 'Contrato editorial no encontrado' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.publishingContractsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un contrato editorial' })
  @ApiParam({ name: 'id', description: 'UUID del contrato editorial' })
  @ApiResponse({ status: 200, description: 'Contrato editorial actualizado' })
  update(@Param('id') id: string, @Body() dto: UpdatePublishingContractDto, @CurrentUser() user: JwtPayload) {
    return this.publishingContractsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un contrato editorial' })
  @ApiParam({ name: 'id', description: 'UUID del contrato editorial' })
  @ApiResponse({ status: 204, description: 'Contrato editorial eliminado' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.publishingContractsService.remove(id, user);
  }
}
