/**
 * Verificación manual y aislada de LegalProofService, sin wiring a
 * tracks/requested-tracks ni ningún otro módulo de dominio.
 *
 * Requiere que la migración de legal_proofs ya esté corrida
 * (npm run migration:run) y las credenciales de DB/storage en .env.local.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/verify-legal-proof.ts <ruta-a-un-archivo-local>
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'local';

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '../src/shared/config/database/database.module';
import { StorageModule } from '../src/shared/storage/storage.module';
import { EventBusModule } from '../src/shared/events/event-bus.module';
import { LegalProofModule } from '../src/shared/legal-proof/legal-proof.module';
import { LegalProofService } from '../src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from '../src/shared/legal-proof/entities/legal-entity-type.enum';

@Module({
  imports: [DatabaseModule, EventBusModule, StorageModule.forRootAsync(), LegalProofModule],
})
class VerifyLegalProofBootstrap {}

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

function guessMimeType(filePath: string): string {
  return MIME_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Uso: ts-node scripts/verify-legal-proof.ts <ruta-a-un-archivo-local>');
  }

  const buffer = fs.readFileSync(filePath);

  const app = await NestFactory.createApplicationContext(VerifyLegalProofBootstrap);
  const legalProofService = app.get(LegalProofService);

  const result = await legalProofService.generateProof({
    file: { buffer, fileName: path.basename(filePath), mimeType: guessMimeType(filePath) },
    context: {
      entityType: LegalEntityType.TRACK,
      entityId: '00000000-0000-0000-0000-000000000000',
    },
  });

  console.log(JSON.stringify(result, null, 2));

  await app.close();
}

main().catch((err) => {
  console.error('✘ Error:', err);
  process.exit(1);
});
