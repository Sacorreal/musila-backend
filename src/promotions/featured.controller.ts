import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeaturedService } from './featured.service';

/**
 * Endpoints públicos de destacados consumidos por la web y la app móvil
 * (requerimiento §FEATURES 8, §Flow 4/5). Sin autenticación y con caché para
 * responder en <300ms.
 */
@ApiTags('Destacados (público)')
@Controller('featured')
export class FeaturedController {
  constructor(private readonly featuredService: FeaturedService) {}

  @Get('tracks')
  @ApiOperation({ summary: 'Tracks destacados vigentes (máx. 10)' })
  getTracks() {
    return this.featuredService.getFeaturedTracks();
  }

  @Get('composers')
  @ApiOperation({ summary: 'Compositores destacados vigentes (máx. 5)' })
  getComposers() {
    return this.featuredService.getFeaturedComposers();
  }
}
