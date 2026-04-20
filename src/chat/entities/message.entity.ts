import {
    Entity,
    CreateDateColumn,
    ManyToOne,
    Column,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Chat } from 'src/chat/entities/chat.entity'
import { User } from 'src/users/entities/user.entity'

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

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;
}