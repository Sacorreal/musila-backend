export interface RealtimeUIEventMap {
  'room.joined': {
    room: string;
    playlistId: string;
  };

  'room.left': {
    room: string;
    playlistId: string;
  };

  'auth.error': {
    message: string;
  };
}