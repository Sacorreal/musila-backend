import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { CreatorIdService } from './creator-id.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [CreatorIdService],
  exports: [CreatorIdService],
})
export class CreatorIdModule {}
