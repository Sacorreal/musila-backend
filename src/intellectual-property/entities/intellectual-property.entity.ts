import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@ObjectType({
  description: 'Registros de propiedad intelectual que posee la cancion',
})
@Entity({ name: 'intellectual_property' })
export class IntellectualProperty {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('varchar', { nullable: false })
  @Field(() => String)
  title: string;

  @ManyToOne(() => Track, (track) => track.intellectualProperties)
  @Field(() => Track)
  track: Track;

  @Column('varchar', { nullable: false, name: 'document_url' })
  @Field(() => String)
  documentUrl: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field(() => String)
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field()
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  @Field()
  deletedAt?: Date;
}
