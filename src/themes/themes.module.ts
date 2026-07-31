import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from './entities/theme.entity';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';
import { Track } from 'src/tracks/entities/track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Theme, Track])],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule { }
