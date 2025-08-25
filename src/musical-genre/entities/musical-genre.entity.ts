import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'musical_genre' })
@ObjectType()
export class MusicalGenre {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  genre: string;

  @Column({ type: 'text', nullable: true, array: true })
  @Field(() => [String], { nullable: true })
  subGenre?: string[];

  @OneToMany(() => Track, (track) => track.genre, { cascade: true })
  @Field(() => [Track])
  tracks: Track[];

  @CreateDateColumn({ name: 'created_at' })
  @Field(() => Date)
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
