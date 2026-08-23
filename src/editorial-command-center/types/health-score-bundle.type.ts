import { Certificate } from 'src/certificates/entities/certificate.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { Split } from 'src/splits/entities/split.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { ResolvedPublisherShare } from 'src/publisher-share/publisher-share.types';

/**
 * Snapshot de todo lo que el `HealthScoreCalculatorService` necesita para
 * evaluar una obra, ya resuelto desde las 5 entidades donde vive fragmentado
 * el expediente (`Track`, `RegistrationFile`, `Certificate`,
 * `IntellectualProperty`, `Split`). Puramente de lectura: el calculador no
 * hace queries, solo recibe el bundle ya armado por `EditorialCommandCenterService`.
 */
export interface TrackHealthBundle {
  track: Track;
  registrationFile: RegistrationFile | null;
  certificate: Certificate | null;
  intellectualProperties: IntellectualProperty[];
  split: Split | null;
  /** Publisher's Share resuelto para el autor principal de la obra (creador del split, o primer autor si aún no hay split). */
  publisherShares: ResolvedPublisherShare[];
}
