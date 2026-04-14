import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { GuestsService } from 'src/guests/guests.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Guest } from 'src/guests/entities/guest.entity';
//Guest
import { RegisterGuestDto } from '../guests/dto/register-guest.dto';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly guestsService: GuestsService,
    private readonly jwtService: JwtService,
    
  ) {}

  /**
   * Login unificado para User y Guest usando citizenID.
   *
   * Flujo de resolución:
   * 1. Busca en tabla `users` (User).
   * 2. Si no lo encuentra, busca en tabla `guest` (Guest).
   * 3. Valida contraseña.
   */
  async loginService(dto: LoginAuthDto): Promise<{ token: string }> {
    const { citizenID, password } = dto;

    // 1. Intentar encontrar en la tabla de Usuarios regulares
    let account: User | Guest | null =
      await this.usersService.findUserBycitizenIDService(citizenID);

    // 2. Si no se encuentra, intentar encontrar en la tabla de Invitados
    if (!account) {
      account = await this.guestsService.findGuestByCitizenIDForAuth(citizenID);
    }

    // 3. Validar existencia y contraseña
    if (!account || !account.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 4. Generar token
    const token = await this.createToken(account);

    return { token };
  }

  async registerService(user: RegisterAuthDto) {
    const userExists = await this.usersService.findUserBycitizenIDService(
      user.citizenID,
    );

    if (userExists) throw new UnauthorizedException('El usuario ya existe');

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser = await this.usersService.createUserService({
      ...user,
      password: hashedPassword,
    });

    const token = await this.createToken(newUser);

    return { token };
  }

  async registerGuestService(guest: RegisterGuestDto) {
    if (guest.password !== guest.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    const newGuest = await this.guestsService.registerFromInvite(guest);
    const token = await this.createToken(newGuest);
    return { token };
  }

  /**
   * Genera token JWT unificado para User o Guest.
   */
  private async createToken(account: User | Guest): Promise<string> {
    const payload: JwtPayload = {
      id: account.id,
      email: account.email,
      role: account.role,
      name: account.name,
    };
    return this.jwtService.signAsync(payload);
  }
}
