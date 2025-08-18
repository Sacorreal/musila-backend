import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Track } from 'src/tracks/entities/track.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'musical_genre' })
@ObjectType()
export class MusicalGenre {

  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string

  @Column()
  @Field()
  genre: string

  @Column({ type: 'text', nullable: true, array: true })
  @Field(() => [String], { nullable: true })
  subgnre?: string[]

  @OneToMany(() => Track, track => track.genre, { cascade: true })
  @Field(() => [Track])
  tracks: Track[]

  @CreateDateColumn({ name: 'created_at' })
  @Field(() => Date)
  createdAt: Date


}
