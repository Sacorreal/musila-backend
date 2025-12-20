import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { usersMock } from "./users.mock";
import * as bcrypt from 'bcrypt';


@Injectable()
export class UsersSeed {
    constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) { }
    async seedUsers() {

        for (const user of usersMock) {
            const existingUser = await this.usersRepository.findOne({ where: { email: user.email }, withDeleted: true });

            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(user.password, 10)

                await this.usersRepository.save({
                    ...user,
                    password: hashedPassword
                })
            }
        }
    }
}