import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { LegalIdentity } from './entities/legal-identity.entity';
import { LegalIdentityService } from './legal-identity.service';
import { LegalIdentityCipherService } from './crypto/legal-identity-cipher.service';
import { LegalIdentityGuard } from './guards/legal-identity.guard';

@Module({
  imports: [TypeOrmModule.forFeature([LegalIdentity, User])],
  providers: [LegalIdentityService, LegalIdentityCipherService, LegalIdentityGuard],
  exports: [LegalIdentityService, LegalIdentityGuard],
})
export class LegalIdentityModule {}
