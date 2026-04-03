import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
   
  ) { }

  async loginService({ citizenID, password }: LoginAuthDto) {
    const user = await this.usersService.findUserBycitizenIDService(citizenID)

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Credenciales incorrectas');

    const token = await this.createToken(user);

    return { token };
  }

  async registerService(user: RegisterAuthDto) {
    const userExists = await this.usersService.findUserBycitizenIDService(user.citizenID);

    if (userExists) throw new UnauthorizedException('El usuario ya existe');

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser = await this.usersService.createUserService({
      ...user,
      password: hashedPassword
    },
    
    );  


    const token = await this.createToken(newUser);

    return { token };
  }

  private async createToken(user: User) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const token = await this.jwtService.signAsync(payload);

    return token;
  }



 
}
