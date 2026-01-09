import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Búsqueda')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    @ApiOperation({
        summary: 'Buscar en el sistema',
        description: 'Realiza una búsqueda general en el sistema que incluye usuarios, pistas musicales, géneros y otros elementos.',
    })
    @ApiQuery({
        name: 'q',
        required: true,
        description: 'Término de búsqueda',
        example: 'rock',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'Resultados de búsqueda obtenidos exitosamente',
        schema: {
            type: 'object',
            properties: {
                tracks: { type: 'array', description: 'Pistas musicales encontradas' },
                users: { type: 'array', description: 'Usuarios encontrados' },
                genres: { type: 'array', description: 'Géneros musicales encontrados' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Parámetro de búsqueda no proporcionado' })
    async searchController(@Query('q') query: string) {
        return await this.searchService.searchService(query);
    }
}
