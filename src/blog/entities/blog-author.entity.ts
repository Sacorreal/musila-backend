import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogArticle } from './blog-article.entity';

@Entity({ name: 'blog_author' })
export class BlogAuthor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  @Column('varchar')
  role: string;

  @Column('text')
  bio: string;

  @Column({ type: 'varchar', nullable: true, name: 'avatar_url' })
  avatarUrl?: string;

  @Column({ type: 'varchar', nullable: true, name: 'avatar_key' })
  avatarKey?: string;

  @Column('varchar')
  slug: string;

  @ManyToMany(() => BlogArticle, (article) => article.authors)
  articles: BlogArticle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
