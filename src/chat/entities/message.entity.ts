import {
  Entity,
  CreateDateColumn,
  ManyToOne,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Chat } from 'src/chat/entities/chat.entity';
import { User } from 'src/users/entities/user.entity';
import { MessageType } from '../types/chat.types'

@Entity({ name: 'message' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat;

  @ManyToOne(() => User)
  sender: User;

  @Column('text')
  content: string;

  @Column({ default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  fileKey?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  mimeType?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
