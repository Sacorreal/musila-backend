import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MusicalGenre])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule { }
