import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';

import {
  Entity,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  Column,
} from 'typeorm';

import { Message } from './message.entity';
import { Guest } from 'src/guests/entities/guest.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatType } from '../types/chat.types';

@Entity({ name: 'chat' })
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.REQUEST,
  })
  type: ChatType;

  @OneToOne(() => RequestedTrack, (rt) => rt.chat, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn()
  request?: RequestedTrack | null;

  @ManyToMany(() => User, { cascade: false })
  @JoinTable({
    name: 'chat_participants',
    joinColumn: {
      name: 'chat_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  participants?: User[];

  @OneToMany(() => Message, (m) => m.chat)
  messages?: Message[];

  @ManyToMany(() => Guest, (guest) => guest.chats, {
    cascade: false,
  })
  @JoinTable({
    name: 'chat_guests',
    joinColumn: {
      name: 'chat_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'guest_id',
      referencedColumnName: 'id',
    },
  })
  guests?: Guest[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
