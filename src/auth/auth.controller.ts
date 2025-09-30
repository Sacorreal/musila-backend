import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async loginController(@Body() user: LoginAuthDto) {
    return await this.authService.loginService(user);
  }

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar'))
  async registerController(@Body() user: RegisterAuthDto, @UploadedFile() file?: Express.Multer.File) {
    if (user.password !== user.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');


    return this.authService.registerService(user, file);
  }
}
