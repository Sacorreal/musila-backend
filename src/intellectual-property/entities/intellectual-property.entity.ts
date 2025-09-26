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
  @ApiProperty({ example: '' , description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '' , description: '' })
  @Column('varchar', { nullable: false })
  title: string;

  @ApiProperty({ example: '' , description: '' })
  @ManyToOne(() => Track, (track) => track.intellectualProperties)
  track: Track;

  @ApiProperty({ example: '' , description: '' })
  @Column('varchar', { nullable: false, name: 'document_url' })
  documentUrl: string;

  @ApiProperty({ example: '' , description: '' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({ example: '' , description: '' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ example: '' , description: '' })  
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
