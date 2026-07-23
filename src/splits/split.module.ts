import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';

import { Split } from './entities/split.entity';
import { SplitAuthor } from './entities/split-author.entity';
import { SplitController } from './split.controller';
import { SplitService } from './split.service';
import { SplitListener } from './listeners/split.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Split, SplitAuthor, Track, User, IntellectualProperty])],
  controllers: [SplitController],
  providers: [SplitService, SplitListener],
  exports: [SplitService],
})
export class SplitModule {}
