import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishingContract } from './entities/publishing-contract.entity';
import { PublishingContractsController } from './publishing-contracts.controller';
import { PublishingContractsService } from './publishing-contracts.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublishingContract])],
  controllers: [PublishingContractsController],
  providers: [PublishingContractsService],
  exports: [PublishingContractsService],
})
export class PublishingContractsModule {}
