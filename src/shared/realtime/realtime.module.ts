import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RealtimeGateway } from './gateway/realtime.gateway';
import { PlaylistListener } from './listeners/playlist.listener';
import { SocketAuthService } from './socket-auth.service';


@Module({
  imports: [
    JwtModule
  ],
  providers: [
    RealtimeGateway,
    PlaylistListener,
    SocketAuthService
  ],
  exports: [],
})
export class RealtimeModule { }