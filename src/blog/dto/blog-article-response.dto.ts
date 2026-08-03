import { ApiProperty } from '@nestjs/swagger';
import { BlogArticle } from '../entities/blog-article.entity';
import { BlogAuthor } from '../entities/blog-author.entity';
import { BlogTag } from '../entities/blog-tag.entity';
import { BlogArticleStatus } from '../entities/blog-article-status.enum';

const WORDS_PER_MINUTE = 200;

function calculateReadingTimeMinutes(contentMarkdown: string): number {
  const wordCount = contentMarkdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export class BlogArticleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() excerpt: string;
  @ApiProperty() contentMarkdown: string;
  @ApiProperty({ nullable: true }) coverImageUrl?: string;
  @ApiProperty({ nullable: true }) youtubeUrl?: string;
  @ApiProperty({ enum: BlogArticleStatus }) status: BlogArticleStatus;
  @ApiProperty({ nullable: true }) publishedAt?: Date;
  @ApiProperty() readingTimeMinutes: number;
  @ApiProperty({ type: [BlogAuthor] }) authors: BlogAuthor[];
  @ApiProperty({ type: [BlogTag] }) tags: BlogTag[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(article: BlogArticle): BlogArticleResponseDto {
    const dto = new BlogArticleResponseDto();
    dto.id = article.id;
    dto.title = article.title;
    dto.slug = article.slug;
    dto.excerpt = article.excerpt ?? '';
    dto.contentMarkdown = article.contentMarkdown;
    dto.coverImageUrl = article.coverImageUrl;
    dto.youtubeUrl = article.youtubeUrl;
    dto.status = article.status;
    dto.publishedAt = article.publishedAt;
    dto.readingTimeMinutes = calculateReadingTimeMinutes(article.contentMarkdown);
    dto.authors = article.authors;
    dto.tags = article.tags;
    dto.createdAt = article.createdAt;
    dto.updatedAt = article.updatedAt;
    return dto;
  }
}

export class PaginatedBlogArticleResponseDto {
  @ApiProperty({ type: [BlogArticleResponseDto] })
  data: BlogArticleResponseDto[];

  @ApiProperty()
  total: number;
}
