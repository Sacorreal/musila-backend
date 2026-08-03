import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogTag } from './entities/blog-tag.entity';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

@Injectable()
export class BlogTagsService {
  constructor(
    @InjectRepository(BlogTag)
    private readonly blogTagRepository: Repository<BlogTag>,
  ) { }

  async createTagService(createBlogTagDto: CreateBlogTagDto): Promise<BlogTag> {
    const tag = this.blogTagRepository.create(createBlogTagDto);
    return await this.blogTagRepository.save(tag);
  }

  async findAllTagsService(pagination: PaginationDto): Promise<{ data: BlogTag[]; total: number }> {
    const { limit, offset } = pagination;

    const [data, total] = await this.blogTagRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOneTagService(id: string): Promise<BlogTag> {
    const tag = await this.blogTagRepository.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('La etiqueta no existe');
    return tag;
  }

  async updateTagService(id: string, updateBlogTagDto: UpdateBlogTagDto): Promise<BlogTag> {
    const tag = await this.findOneTagService(id);
    Object.assign(tag, updateBlogTagDto);
    return await this.blogTagRepository.save(tag);
  }

  async removeTagService(id: string): Promise<{ id: string; message: string }> {
    const tag = await this.blogTagRepository.findOne({
      where: { id },
      relations: ['articles'],
    });
    if (!tag) throw new NotFoundException('La etiqueta no existe');

    if (tag.articles?.length > 0) {
      throw new ConflictException('No se puede eliminar una etiqueta con artículos asociados');
    }

    await this.blogTagRepository.softDelete(id);

    return { id, message: 'Etiqueta eliminada correctamente' };
  }
}
