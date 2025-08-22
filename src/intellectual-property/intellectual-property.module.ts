import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { IntellectualProperty } from './entities/intellectual-property.entity';
import { IntellectualPropertyResolver } from './intellectual-property.resolver';
import { IntellectualPropertyService } from './intellectual-property.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntellectualProperty, Track])],
  providers: [IntellectualPropertyResolver, IntellectualPropertyService],
})
export class IntellectualPropertyModule {}
