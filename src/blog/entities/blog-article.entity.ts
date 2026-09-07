import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogAuthor } from './blog-author.entity';
import { BlogTag } from './blog-tag.entity';
import { BlogArticleStatus } from './blog-article-status.enum';

@Entity({ name: 'blog_article' })
export class BlogArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  title: string;

  @Column('varchar')
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text', name: 'content_markdown' })
  contentMarkdown: string;

  @Column({ type: 'varchar', nullable: true, name: 'cover_image_url' })
  coverImageUrl?: string;

  @Column({ type: 'varchar', nullable: true, name: 'cover_image_key' })
  coverImageKey?: string;

  @Column({ type: 'varchar', nullable: true, name: 'youtube_url' })
  youtubeUrl?: string;

  @Column({
    type: 'enum',
    enum: BlogArticleStatus,
    default: BlogArticleStatus.DRAFT,
  })
  status: BlogArticleStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt?: Date;

  @ManyToMany(() => BlogAuthor, (author) => author.articles, { nullable: false })
  @JoinTable({ name: 'blog_article_authors' })
  authors: BlogAuthor[];

  @ManyToMany(() => BlogTag, (tag) => tag.articles, { nullable: false })
  @JoinTable({ name: 'blog_article_tags' })
  tags: BlogTag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
