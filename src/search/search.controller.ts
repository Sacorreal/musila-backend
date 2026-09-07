import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { SearchService } from './search.service';

@ApiTags('Búsqueda')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    @RequireCapability('marketplace.search')
    @ApiOperation({
        summary: 'Buscar en el sistema',
        description: 'Realiza una búsqueda general en el sistema que incluye usuarios, pistas musicales, géneros y otros elementos. El parámetro "limit" acota la cantidad de resultados por categoría (tracks, géneros, autores), no el total global.',
    })
    @ApiResponse({
        status: 200,
        description: 'Resultados de búsqueda obtenidos exitosamente',
        type: SearchResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Parámetro de búsqueda "q" no proporcionado o inválido' })
    async searchController(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
        return await this.searchService.searchService(query);
    }
}
