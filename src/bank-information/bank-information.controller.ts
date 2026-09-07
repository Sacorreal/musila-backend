import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { BankInformationService } from './bank-information.service';
import { CreateColombiaBankInformationDto } from './dto/create-colombia-bank-information.dto';
import { CreateForeignBankInformationDto } from './dto/create-foreign-bank-information.dto';

@ApiTags('Bank Information')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('bank-information')
export class BankInformationController {
  constructor(private readonly bankInformationService: BankInformationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Indica si el usuario tiene un registro de información bancaria pendiente' })
  getPending(@CurrentUser() user: JwtPayload) {
    return this.bankInformationService.getPendingStatus(user.id);
  }

  @Get('transfer-options')
  @ApiOperation({ summary: 'Opciones de transferencia disponibles en Colombia (bancos, tipo de cuenta/documento), obtenidas dinámicamente de Wompi' })
  getTransferOptions() {
    return this.bankInformationService.getTransferOptions();
  }

  @Get('me')
  @ApiOperation({ summary: 'Información bancaria configurada del usuario (para prellenar edición)' })
  getMine(@CurrentUser() user: JwtPayload) {
    return this.bankInformationService.getMyBankInformation(user.id);
  }

  @Post('colombia')
  @ApiOperation({ summary: 'Registra o edita la información bancaria de cobro en Colombia (Wompi)' })
  saveColombia(@CurrentUser() user: JwtPayload, @Body() dto: CreateColombiaBankInformationDto) {
    return this.bankInformationService.saveColombia(user.id, dto);
  }

  @Post('foreign')
  @ApiOperation({ summary: 'Registra o edita la información bancaria de cobro en el extranjero (Global66)' })
  saveForeign(@CurrentUser() user: JwtPayload, @Body() dto: CreateForeignBankInformationDto) {
    return this.bankInformationService.saveForeign(user.id, dto);
  }
}
