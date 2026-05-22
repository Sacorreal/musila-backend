import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ example: 120 })
  totalUsers: number;

  @ApiProperty({ example: 340 })
  totalTracks: number;

  @ApiProperty({ example: 18 })
  totalGenres: number;

  @ApiProperty({ example: 87 })
  totalRequests: number;

  @ApiProperty({ example: 30 })
  pendingRequests: number;

  @ApiProperty({ example: 45 })
  approvedRequests: number;

  @ApiProperty({ example: 12 })
  rejectedRequests: number;
}
