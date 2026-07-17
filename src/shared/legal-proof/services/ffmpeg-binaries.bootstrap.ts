import { Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';

const logger = new Logger('FfmpegBinariesBootstrap');

/**
 * Fija rutas absolutas a los binarios de ffmpeg/ffprobe empaquetados vía npm
 * en vez de depender 100% del PATH del sistema. Si los paquetes instaladores
 * todavía no están instalados, se degrada silenciosamente al PATH del sistema
 * (nixpacks.toml los declara como paquete de sistema en producción) en vez de
 * impedir que el resto de la app arranque.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg') as typeof import('@ffmpeg-installer/ffmpeg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe') as typeof import('@ffprobe-installer/ffprobe');

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
} catch {
  logger.warn(
    '@ffmpeg-installer/ffmpeg o @ffprobe-installer/ffprobe no están instalados; se usará ffmpeg/ffprobe del PATH del sistema.',
  );
}
