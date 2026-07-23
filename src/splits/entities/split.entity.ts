import { ApiProperty } from '@nestjs/swagger';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SplitAuthor } from './split-author.entity';
import { SplitStatus } from './split-status.enum';

@Entity({ name: 'split' })
export class Split {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Track, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @ApiProperty({ enum: SplitStatus, example: SplitStatus.PENDING_APPROVAL })
  @Column({
    type: 'enum',
    enum: SplitStatus,
    default: SplitStatus.PENDING_APPROVAL,
  })
  status: SplitStatus;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => IntellectualProperty, { nullable: true })
  @JoinColumn({ name: 'intellectual_property_id' })
  intellectualProperty?: IntellectualProperty;

  @OneToMany(() => SplitAuthor, (splitAuthor) => splitAuthor.split, {
    cascade: true,
  })
  authors: SplitAuthor[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
