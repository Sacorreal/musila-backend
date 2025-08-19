import { BadRequestException, Body, Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Post } from '@nestjs/common'
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async loginController(@Body() user: LoginAuthDto) {
    return await this.authService.loginService(user)
  }

  @Post('register')
  async registerController(@Body() user: RegisterAuthDto){
    if(user.password !== user.repeatPassword) throw new BadRequestException('Las contraseñas no coinciden')
    
    return this.authService.registerService(user)
  }
}
