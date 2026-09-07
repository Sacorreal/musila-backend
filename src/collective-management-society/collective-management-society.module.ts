import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectiveManagementSociety } from './entities/collective-management-society.entity';
import { CollectiveManagementSocietyController } from './collective-management-society.controller';
import { CollectiveManagementSocietyService } from './collective-management-society.service';

@Module({
  imports: [TypeOrmModule.forFeature([CollectiveManagementSociety])],
  controllers: [CollectiveManagementSocietyController],
  providers: [CollectiveManagementSocietyService],
  exports: [CollectiveManagementSocietyService],
})
export class CollectiveManagementSocietyModule {}
