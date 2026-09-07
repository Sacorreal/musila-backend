import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { Guest } from 'src/guests/entities/guest.entity';
import { User } from 'src/users/entities/user.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { ChatType } from './types/chat.types';

type QueryBuilderMock = {
  innerJoin: jest.Mock;
  where: jest.Mock;
  getOne: jest.Mock;
};

describe('ChatService', () => {
  let service: ChatService;
  let chatRepository: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let queryBuilder: QueryBuilderMock;

  beforeEach(async () => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    chatRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn((entity: Record<string, unknown>) => entity),
      save: jest.fn(),
    };
    userRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Chat), useValue: chatRepository },
        { provide: getRepositoryToken(Message), useValue: {} },
        { provide: getRepositoryToken(Guest), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrGetDirectChat', () => {
    it('rechaza iniciar una conversación con uno mismo', async () => {
      await expect(
        service.createOrGetDirectChat('user-1', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('falla si el usuario destino no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(
        service.createOrGetDirectChat('user-1', 'user-2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reutiliza el chat directo existente entre ambos (get)', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-2' });
      queryBuilder.getOne.mockResolvedValue({ id: 'existing-chat' });

      const result = await service.createOrGetDirectChat('user-1', 'user-2');

      expect(result).toEqual({ chatId: 'existing-chat' });
      expect(chatRepository.save).not.toHaveBeenCalled();
    });

    it('crea un chat directo nuevo si no existe (create)', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-2' });
      queryBuilder.getOne.mockResolvedValue(null);
      chatRepository.save.mockResolvedValue({ id: 'new-chat' });

      const result = await service.createOrGetDirectChat('user-1', 'user-2');

      expect(result).toEqual({ chatId: 'new-chat' });
      expect(chatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: ChatType.DIRECT }),
      );
      expect(chatRepository.save).toHaveBeenCalled();
    });
  });
});
