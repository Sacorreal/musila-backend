import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StorageService } from 'src/shared/storage/storage.service';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { slugify } from 'src/shared/utils/slug.util';
import { BlogArticle } from './entities/blog-article.entity';
import { BlogAuthor } from './entities/blog-author.entity';
import { BlogTag } from './entities/blog-tag.entity';
import { BlogArticleStatus } from './entities/blog-article-status.enum';
import { CreateBlogArticleDto } from './dto/create-blog-article.dto';
import { UpdateBlogArticleDto } from './dto/update-blog-article.dto';
import { BlogArticleAdminPaginationDto } from './dto/blog-article-admin-pagination.dto';
import { BlogArticlePublicPaginationDto } from './dto/blog-article-public-pagination.dto';
import { BlogArticleResponseDto, PaginatedBlogArticleResponseDto } from './dto/blog-article-response.dto';

const ARTICLE_RELATIONS = ['authors', 'tags'];
const EXCERPT_LENGTH = 160;

function buildExcerpt(contentMarkdown: string): string {
  const plainText = contentMarkdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length > EXCERPT_LENGTH
    ? `${plainText.slice(0, EXCERPT_LENGTH).trim()}...`
    : plainText;
}

@Injectable()
export class BlogArticlesService {
  constructor(
    @InjectRepository(BlogArticle)
    private readonly blogArticleRepository: Repository<BlogArticle>,
    @InjectRepository(BlogAuthor)
    private readonly blogAuthorRepository: Repository<BlogAuthor>,
    @InjectRepository(BlogTag)
    private readonly blogTagRepository: Repository<BlogTag>,
    private readonly storageService: StorageService,
  ) { }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

     
    while (true) {
      const existing = await this.blogArticleRepository.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private async resolveAuthors(authorIds: string[]): Promise<BlogAuthor[]> {
    const authors = await this.blogAuthorRepository.find({ where: { id: In(authorIds) } });
    if (authors.length !== authorIds.length) {
      throw new NotFoundException('Uno o más autores no existen');
    }
    return authors;
  }

  private async resolveTags(tagIds: string[]): Promise<BlogTag[]> {
    const tags = await this.blogTagRepository.find({ where: { id: In(tagIds) } });
    if (tags.length !== tagIds.length) {
      throw new NotFoundException('Una o más etiquetas no existen');
    }
    return tags;
  }

  /** Ejecuta un queryBuilder de ids con joins/filtros y devuelve las entidades completas paginadas, evitando que `leftJoinAndSelect` + `where` trunque las colecciones authors/tags. */
  private async fetchPaginatedByIdsQuery(
    idsQb: ReturnType<Repository<BlogArticle>['createQueryBuilder']>,
    limit: number,
    offset: number,
    order: 'createdAt' | 'publishedAt',
  ): Promise<PaginatedBlogArticleResponseDto> {
    const total = await idsQb.getCount();
    const pagedRows = await idsQb.take(limit).skip(offset).getMany();
    const ids = pagedRows.map((row) => row.id);

    if (ids.length === 0) return { data: [], total };

    const data = await this.blogArticleRepository.find({
      where: { id: In(ids) },
      relations: ARTICLE_RELATIONS,
      order: { [order]: 'DESC' },
    });

    const orderedData = ids
      .map((id) => data.find((article) => article.id === id))
      .filter((article): article is BlogArticle => Boolean(article));

    return { data: orderedData.map((article) => BlogArticleResponseDto.fromEntity(article)), total };
  }

  async createArticleService(createBlogArticleDto: CreateBlogArticleDto): Promise<BlogArticleResponseDto> {
    const { authorIds, tagIds, excerpt, status, ...rest } = createBlogArticleDto;

    const authors = await this.resolveAuthors(authorIds);
    const tags = await this.resolveTags(tagIds);
    const slug = await this.ensureUniqueSlug(slugify(rest.title));
    const resolvedStatus = status ?? BlogArticleStatus.DRAFT;

    const article = this.blogArticleRepository.create({
      ...rest,
      slug,
      excerpt: excerpt?.trim() || buildExcerpt(rest.contentMarkdown),
      status: resolvedStatus,
      publishedAt: resolvedStatus === BlogArticleStatus.PUBLISHED ? new Date() : undefined,
      authors,
      tags,
    });

    const saved = await this.blogArticleRepository.save(article);
    return BlogArticleResponseDto.fromEntity(saved);
  }

  async findAllArticlesAdminService(pagination: BlogArticleAdminPaginationDto): Promise<PaginatedBlogArticleResponseDto> {
    const { limit = 10, offset = 0, search, authorId, tagId, status, dateFrom, dateTo } = pagination;

    const idsQb = this.blogArticleRepository
      .createQueryBuilder('article')
      .select('article.id')
      .orderBy('article.createdAt', 'DESC');

    if (search) idsQb.andWhere('article.title ILIKE :search', { search: `%${search}%` });
    if (status) idsQb.andWhere('article.status = :status', { status });
    if (dateFrom) idsQb.andWhere('article.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) idsQb.andWhere('article.createdAt <= :dateTo', { dateTo });
    if (authorId) idsQb.innerJoin('article.authors', 'filterAuthor', 'filterAuthor.id = :authorId', { authorId });
    if (tagId) idsQb.innerJoin('article.tags', 'filterTag', 'filterTag.id = :tagId', { tagId });

    return this.fetchPaginatedByIdsQuery(idsQb, limit, offset, 'createdAt');
  }

  async findAllArticlesPublicService(pagination: BlogArticlePublicPaginationDto): Promise<PaginatedBlogArticleResponseDto> {
    const { limit = 10, offset = 0, search, tagId, authorSlug } = pagination;

    const idsQb = this.blogArticleRepository
      .createQueryBuilder('article')
      .select('article.id')
      .where('article.status = :status', { status: BlogArticleStatus.PUBLISHED })
      .orderBy('article.publishedAt', 'DESC');

    if (search) idsQb.andWhere('article.title ILIKE :search', { search: `%${search}%` });
    if (tagId) idsQb.innerJoin('article.tags', 'filterTag', 'filterTag.id = :tagId', { tagId });
    if (authorSlug) idsQb.innerJoin('article.authors', 'filterAuthor', 'filterAuthor.slug = :authorSlug', { authorSlug });

    return this.fetchPaginatedByIdsQuery(idsQb, limit, offset, 'publishedAt');
  }

  async findArticlesByAuthorIdPublicService(authorId: string, pagination: PaginationDto): Promise<PaginatedBlogArticleResponseDto> {
    const { limit = 10, offset = 0 } = pagination;

    const idsQb = this.blogArticleRepository
      .createQueryBuilder('article')
      .select('article.id')
      .innerJoin('article.authors', 'author', 'author.id = :authorId', { authorId })
      .where('article.status = :status', { status: BlogArticleStatus.PUBLISHED })
      .orderBy('article.publishedAt', 'DESC');

    return this.fetchPaginatedByIdsQuery(idsQb, limit, offset, 'publishedAt');
  }

  async findOneArticleAdminService(id: string): Promise<BlogArticleResponseDto> {
    const article = await this.blogArticleRepository.findOne({ where: { id }, relations: ARTICLE_RELATIONS });
    if (!article) throw new NotFoundException('El artículo no existe');
    return BlogArticleResponseDto.fromEntity(article);
  }

  async findArticleBySlugPublicService(slug: string): Promise<BlogArticleResponseDto> {
    const article = await this.blogArticleRepository.findOne({
      where: { slug, status: BlogArticleStatus.PUBLISHED },
      relations: ARTICLE_RELATIONS,
    });
    if (!article) throw new NotFoundException('El artículo no existe');
    return BlogArticleResponseDto.fromEntity(article);
  }

  async updateArticleService(id: string, updateBlogArticleDto: UpdateBlogArticleDto): Promise<BlogArticleResponseDto> {
    const article = await this.blogArticleRepository.findOne({ where: { id }, relations: ARTICLE_RELATIONS });
    if (!article) throw new NotFoundException('El artículo no existe');

    const { authorIds, tagIds, title, contentMarkdown, excerpt, coverImageKey, status, ...rest } = updateBlogArticleDto;
    const previousCoverImageKey = article.coverImageKey;

    if (authorIds) article.authors = await this.resolveAuthors(authorIds);
    if (tagIds) article.tags = await this.resolveTags(tagIds);

    if (title && title !== article.title) {
      article.title = title;
      // El slug se mantiene tras publicar para no romper enlaces ya compartidos.
      if (article.status === BlogArticleStatus.DRAFT) {
        article.slug = await this.ensureUniqueSlug(slugify(title), id);
      }
    }

    if (contentMarkdown) article.contentMarkdown = contentMarkdown;
    if (excerpt !== undefined) {
      article.excerpt = excerpt.trim() || buildExcerpt(article.contentMarkdown);
    }
    if (coverImageKey !== undefined) article.coverImageKey = coverImageKey;

    Object.assign(article, rest);

    if (status && status !== article.status) {
      article.status = status;
      if (status === BlogArticleStatus.PUBLISHED && !article.publishedAt) {
        article.publishedAt = new Date();
      }
    }

    const saved = await this.blogArticleRepository.save(article);

    if (coverImageKey !== undefined && previousCoverImageKey && previousCoverImageKey !== coverImageKey) {
      await this.storageService.deleteObject(previousCoverImageKey).catch(() => undefined);
    }

    return BlogArticleResponseDto.fromEntity(saved);
  }

  async publishArticleService(id: string): Promise<BlogArticleResponseDto> {
    const article = await this.blogArticleRepository.findOne({ where: { id }, relations: ARTICLE_RELATIONS });
    if (!article) throw new NotFoundException('El artículo no existe');

    article.status = BlogArticleStatus.PUBLISHED;
    if (!article.publishedAt) article.publishedAt = new Date();

    const saved = await this.blogArticleRepository.save(article);
    return BlogArticleResponseDto.fromEntity(saved);
  }

  async unpublishArticleService(id: string): Promise<BlogArticleResponseDto> {
    const article = await this.blogArticleRepository.findOne({ where: { id }, relations: ARTICLE_RELATIONS });
    if (!article) throw new NotFoundException('El artículo no existe');

    article.status = BlogArticleStatus.DRAFT;

    const saved = await this.blogArticleRepository.save(article);
    return BlogArticleResponseDto.fromEntity(saved);
  }

  async removeArticleService(id: string): Promise<{ id: string; message: string }> {
    const article = await this.blogArticleRepository.findOne({ where: { id } });
    if (!article) throw new NotFoundException('El artículo no existe');

    await this.blogArticleRepository.softDelete(id);

    if (article.coverImageKey) {
      await this.storageService.deleteObject(article.coverImageKey).catch(() => undefined);
    }

    return { id, message: 'Artículo eliminado correctamente' };
  }
}
