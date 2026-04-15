import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RealtimeGateway } from './gateway/realtime.gateway';
import { PlaylistListener } from './listeners/playlist.listener';

@Module({
  imports: [
    JwtModule
  ],
  providers: [
    RealtimeGateway,
    PlaylistListener,
  ],
  exports: [],
})
export class RealtimeModule {}