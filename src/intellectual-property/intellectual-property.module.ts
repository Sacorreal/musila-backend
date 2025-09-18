import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { IntellectualProperty } from './entities/intellectual-property.entity';
import { IntellectualPropertyController } from './intellectual-property.controller';
import { IntellectualPropertyService } from './intellectual-property.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntellectualProperty, Track])],
  providers: [IntellectualPropertyController, IntellectualPropertyService],
})
export class IntellectualPropertyModule { }
