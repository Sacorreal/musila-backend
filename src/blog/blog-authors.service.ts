import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { StorageService } from 'src/shared/storage/storage.service';
import { slugify } from 'src/shared/utils/slug.util';
import { BlogAuthor } from './entities/blog-author.entity';
import { CreateBlogAuthorDto } from './dto/create-blog-author.dto';
import { UpdateBlogAuthorDto } from './dto/update-blog-author.dto';
import { BlogAuthorPaginationDto, PaginatedBlogAuthorResponseDto } from './dto/blog-author-pagination.dto';

@Injectable()
export class BlogAuthorsService {
  constructor(
    @InjectRepository(BlogAuthor)
    private readonly blogAuthorRepository: Repository<BlogAuthor>,
    private readonly storageService: StorageService,
  ) { }

  private async assertNameIsAvailable(name: string, excludeId?: string): Promise<void> {
    const qb = this.blogAuthorRepository
      .createQueryBuilder('author')
      .where('LOWER(author.name) = LOWER(:name)', { name });

    if (excludeId) qb.andWhere('author.id != :excludeId', { excludeId });

    const existing = await qb.getOne();
    if (existing) throw new ConflictException('Ya existe un autor con este nombre');
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

     
    while (true) {
      const existing = await this.blogAuthorRepository.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async createAuthorService(createBlogAuthorDto: CreateBlogAuthorDto): Promise<BlogAuthor> {
    const { slug: requestedSlug, ...rest } = createBlogAuthorDto;

    await this.assertNameIsAvailable(rest.name);

    const slug = await this.ensureUniqueSlug(slugify(requestedSlug || rest.name));

    const author = this.blogAuthorRepository.create({ ...rest, slug });
    return await this.blogAuthorRepository.save(author);
  }

  async findAllAuthorsService(pagination: BlogAuthorPaginationDto): Promise<PaginatedBlogAuthorResponseDto> {
    const { limit, offset, search } = pagination;

    const [data, total] = await this.blogAuthorRepository.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOneAuthorAdminService(id: string): Promise<BlogAuthor> {
    const author = await this.blogAuthorRepository.findOne({ where: { id } });
    if (!author) throw new NotFoundException('El autor no existe');
    return author;
  }

  async findBySlugPublicService(slug: string): Promise<BlogAuthor> {
    const author = await this.blogAuthorRepository.findOne({ where: { slug } });
    if (!author) throw new NotFoundException('El autor no existe');
    return author;
  }

  async updateAuthorService(id: string, updateBlogAuthorDto: UpdateBlogAuthorDto): Promise<BlogAuthor> {
    const author = await this.findOneAuthorAdminService(id);
    const { slug: requestedSlug, avatarKey, ...rest } = updateBlogAuthorDto;

    if (rest.name) await this.assertNameIsAvailable(rest.name, id);

    const previousAvatarKey = author.avatarKey;

    Object.assign(author, rest);
    if (avatarKey !== undefined) author.avatarKey = avatarKey;

    if (rest.name) {
      author.slug = await this.ensureUniqueSlug(slugify(requestedSlug || rest.name), id);
    }

    const saved = await this.blogAuthorRepository.save(author);

    if (avatarKey !== undefined && previousAvatarKey && previousAvatarKey !== avatarKey) {
      await this.storageService.deleteObject(previousAvatarKey).catch(() => undefined);
    }

    return saved;
  }

  async removeAuthorService(id: string): Promise<{ id: string; message: string }> {
    const author = await this.blogAuthorRepository.findOne({
      where: { id },
      relations: ['articles'],
    });
    if (!author) throw new NotFoundException('El autor no existe');

    if (author.articles?.length > 0) {
      throw new ConflictException('No se puede eliminar un autor con artículos asociados');
    }

    await this.blogAuthorRepository.softDelete(id);

    if (author.avatarKey) {
      await this.storageService.deleteObject(author.avatarKey).catch(() => undefined);
    }

    return { id, message: 'Autor eliminado correctamente' };
  }
}
