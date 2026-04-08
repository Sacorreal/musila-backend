import { ApiProperty } from '@nestjs/swagger';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';


@Entity({ name: 'intellectual_property' })
export class IntellectualProperty {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID único de la propiedad intelectual' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Registro NDA - Canción X', description: 'Título del documento o de la propiedad intelectual' })
  @Column('varchar', { nullable: false })
  title: string;

  @ApiProperty({ type: () => Track, description: 'La pista musical a la que está asociada esta propiedad intelectual' })
  @ManyToOne(() => Track, (track) => track.intellectualProperties)
  track: Track;

  @ApiProperty({ example: 'https://docs.google.com/...', description: 'URL del documento legal respaldatorio' })
  @Column('varchar', { nullable: false, name: 'document_url' })
  documentUrl: string;

  @ApiProperty({ example: '2026-04-08T02:00:00Z', description: 'Fecha de creación' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-08T02:00:00Z', description: 'Fecha de última actualización' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ example: null, description: 'Fecha de eliminación lógica' })  
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
