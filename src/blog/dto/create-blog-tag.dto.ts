import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBlogTagDto {
  @ApiProperty({ example: 'Mastering', description: 'Nombre del servicio/etiqueta.' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la etiqueta es obligatorio' })
  name: string;

  @ApiProperty({ example: '/servicios/mastering', description: 'URL del servicio relacionado (interna o externa).' })
  @IsString()
  @IsNotEmpty({ message: 'La URL de la etiqueta es obligatoria' })
  url: string;

  @ApiProperty({ example: 'headphones', description: 'Nombre del ícono de lucide-react asociado.' })
  @IsString()
  @IsNotEmpty({ message: 'El ícono de la etiqueta es obligatorio' })
  icon: string;
}
