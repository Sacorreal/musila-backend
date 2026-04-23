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
} from 'typeorm';

import { Message } from './message.entity';
import { Guest } from 'src/guests/entities/guest.entity';

@Entity({ name: 'chat' })
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => RequestedTrack, (rt) => rt.chat)
  @JoinColumn()
  request: RequestedTrack;

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
