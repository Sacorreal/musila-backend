import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import { SocialNetworksData } from '../entities/social-networks.type';

/**
 * Claves conocidas y acotadas para redes sociales del usuario.
 * Reemplaza el antiguo Record<string, string> sin validar (permitía payloads
 * JSON arbitrarios y valores no-URL, incluyendo esquemas como `javascript:`).
 */
export class SocialNetworksInput implements SocialNetworksData {
  @ApiPropertyOptional({ example: 'https://instagram.com/usuario' })
  @IsOptional()
  @IsUrl({}, { message: 'instagram debe ser una URL válida' })
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://tiktok.com/@usuario' })
  @IsOptional()
  @IsUrl({}, { message: 'tiktok debe ser una URL válida' })
  tiktok?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@usuario' })
  @IsOptional()
  @IsUrl({}, { message: 'youtube debe ser una URL válida' })
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/usuario' })
  @IsOptional()
  @IsUrl({}, { message: 'twitter debe ser una URL válida' })
  twitter?: string;

  @ApiPropertyOptional({ example: 'https://miweb.com' })
  @IsOptional()
  @IsUrl({}, { message: 'website debe ser una URL válida' })
  website?: string;
}
