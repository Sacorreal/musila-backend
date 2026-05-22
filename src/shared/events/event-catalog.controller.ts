import { Controller, Get } from '@nestjs/common';
import { EventCatalogService } from './event-catalog.service';

@Controller('events')
export class EventCatalogController {
  constructor(private readonly service: EventCatalogService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get('grouped')
  getGrouped() {
    return this.service.groupByEvent();
  }

  @Get('websocket')
  getWebsocketEvents() {
    return this.service.getByChannel('websocket');
  }
}