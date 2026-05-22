import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [User], description: 'Lista de usuarios' })
  data: User[];

  @ApiProperty({
    example: 100,
    description: 'Total de usuarios que coinciden con la consulta',
  })
  total: number;
}
