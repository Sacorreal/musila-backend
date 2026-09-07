import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mood } from './entities/mood.entity';
import { MoodsController } from './moods.controller';
import { MoodsService } from './moods.service';
import { Track } from 'src/tracks/entities/track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mood, Track])],
  controllers: [MoodsController],
  providers: [MoodsService],
})
export class MoodsModule { }
