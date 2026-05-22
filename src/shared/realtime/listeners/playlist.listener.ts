import { Injectable } from '@nestjs/common';
import { EventListener } from '../../events/decorators/event-listener.decorator';
import { RealtimeGateway } from '../gateway/realtime.gateway';
import { AppEventMap } from '../../events/contracts/app-event-map';

@Injectable()
export class PlaylistListener {
  constructor(private readonly gateway: RealtimeGateway) { }

  @EventListener({
    event: 'playlist.updated',
    channel: 'websocket',
  })
  handlePlaylistUpdated(payload: AppEventMap['playlist.updated']) {
    this.gateway.emitPlaylistUpdated(payload);
  }

  @EventListener({
    event: 'playlist.user.added',
    channel: 'websocket',
  })
  handleUserAdded(payload: AppEventMap['playlist.user.added']) {
    this.gateway.emitUserAddedToPlaylist(payload);
  }


}