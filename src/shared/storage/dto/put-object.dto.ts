import { IsNotEmpty, IsString, IsUUID } from 'class-validator';


export class PutObjectDto {
  /**
   * @description Asignar el mismo ID de la entidad (UUID)
   */
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  key!: string;
}
