import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { BlogArticle } from './entities/blog-article.entity';
import { BlogAuthor } from './entities/blog-author.entity';
import { BlogTag } from './entities/blog-tag.entity';
import { BlogArticlesService } from './blog-articles.service';
import { BlogAuthorsService } from './blog-authors.service';
import { BlogTagsService } from './blog-tags.service';
import { BlogArticlesAdminController } from './blog-articles-admin.controller';
import { BlogArticlesController } from './blog-articles.controller';
import { BlogAuthorsAdminController } from './blog-authors-admin.controller';
import { BlogAuthorsController } from './blog-authors.controller';
import { BlogTagsAdminController } from './blog-tags-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogArticle, BlogAuthor, BlogTag]),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    BlogArticlesAdminController,
    BlogArticlesController,
    BlogAuthorsAdminController,
    BlogAuthorsController,
    BlogTagsAdminController,
  ],
  providers: [BlogArticlesService, BlogAuthorsService, BlogTagsService],
})
export class BlogModule { }
