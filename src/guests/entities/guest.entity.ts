import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'guest' })
@ObjectType()
export class Guest {

    @PrimaryGeneratedColumn('uuid')
    @Field(() => ID)
    id: string

    @Column({ type: 'enum', enum: UserRole, default: UserRole.INVITADO })
    @Field(() => UserRole)
    role: UserRole

    @ManyToOne(() => User, (user) => user.guests, { nullable: false })
    @Field(() => User)
    invited_by: User
}
