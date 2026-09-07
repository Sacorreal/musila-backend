import { PartialType } from '@nestjs/swagger';
import { CreateBlogTagDto } from './create-blog-tag.dto';

export class UpdateBlogTagDto extends PartialType(CreateBlogTagDto) {}
