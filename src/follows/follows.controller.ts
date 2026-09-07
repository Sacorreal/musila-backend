import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { FollowsService } from './follows.service';

@ApiTags('Follows')
@UseGuards(JWTAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('users/:userId/follow')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post()
  @ApiOperation({ summary: 'Seguir a un usuario (compositor o cantautor)' })
  @ApiParam({ name: 'userId', description: 'UUID del usuario a seguir' })
  @ApiResponse({ status: 201, description: 'Ahora sigues a este usuario' })
  @ApiResponse({ status: 400, description: 'Rol no permitido o self-follow' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async followController(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.followsService.follow(user.id, userId);
    return { isFollowing: true };
  }

  @Delete()
  @ApiOperation({ summary: 'Dejar de seguir a un usuario' })
  @ApiParam({ name: 'userId', description: 'UUID del usuario a dejar de seguir' })
  @ApiResponse({ status: 200, description: 'Dejaste de seguir a este usuario' })
  async unfollowController(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.followsService.unfollow(user.id, userId);
    return { isFollowing: false };
  }

  @Get('status')
  @ApiOperation({ summary: '¿El usuario autenticado sigue a este usuario?' })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Estado de seguimiento' })
  async statusController(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isFollowing = await this.followsService.isFollowing(user.id, userId);
    return { isFollowing };
  }
}
