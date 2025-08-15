import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import bcrypt from 'bcrypt'
import { User } from 'src/users/entities/user.entity';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) { }

    async loginService({ email, password }: LoginAuthDto) {
        const user = await this.usersService.findUserByEmailService(email)

        if (!user) throw new UnauthorizedException('Credenciales incorrectas')

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) throw new UnauthorizedException('Credenciales incorrectas')

        const token = await this.createToken(user)

        return { token }
    }

    async registerService(user: RegisterAuthDto) {
        const userExists = await this.usersService.findUserByEmailService(user.email)

        if (userExists) throw new UnauthorizedException('El usuario ya existe')

        const hashedPassword = await bcrypt.hash(user.password, 10)

        const newUser = await this.usersService.createUserService({ ...user, password: hashedPassword })

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...sanitizedUser } = newUser

        return sanitizedUser
    }


    private async createToken(user: User) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        }

        const token = await this.jwtService.signAsync(payload)

        return token
    }
}