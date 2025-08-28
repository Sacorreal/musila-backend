import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UploadResultDto {
  @IsBoolean()
  success: boolean;

  @IsUrl()
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
