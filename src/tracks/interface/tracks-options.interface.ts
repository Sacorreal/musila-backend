import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { FilterTrackDto } from '../dto/filter-track.dto';

export interface FindAllTracksOptions {
  user?: JwtPayload;
  params?: FilterTrackDto;
}
