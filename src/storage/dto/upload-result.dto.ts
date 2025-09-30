import { IsBoolean, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UploadResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  url: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsString()
  @IsNotEmpty()
  result: string;

  @IsInt()
  year: number;
}
