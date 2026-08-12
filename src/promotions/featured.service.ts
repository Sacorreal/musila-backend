import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Track } from '../tracks/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { Promotion } from './entities/promotion.entity';
import { PromotionStatus } from './entities/promotion-status.enum';
import { PromotionType } from './entities/promotion-type.enum';
import { PROMOTION_SLOTS } from './promotions.constants';

export interface FeaturedTrackDto {
  promotionId: string;
  trackId: string;
  title: string;
  coverUrl: string | null;
  author: string | null;
  genre: string | null;
}

export interface FeaturedComposerDto {
  promotionId: string;
  composerId: string;
  name: string;
  avatarUrl: string | null;
  genre: string | null;
}

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

/** TTL de la caché en memoria de los destacados públicos (§NF: <300ms). */
const CACHE_TTL_MS = 60_000;

/**
 * Lectura pública de los destacados activos (tracks y compositores). Usa una
 * caché en memoria con TTL corto para cumplir el requisito de <300ms sin cargar
 * la base de datos, sin introducir dependencias nuevas (no hay CacheModule en el
 * repo). La caché se invalida cuando el scheduler activa o expira pautas.
 */
@Injectable()
export class FeaturedService {
  private tracksCache: CacheEntry<FeaturedTrackDto[]> | null = null;
  private composersCache: CacheEntry<FeaturedComposerDto[]> | null = null;

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Invalida la caché (la llama el scheduler tras activar/expirar pautas). */
  invalidate(): void {
    this.tracksCache = null;
    this.composersCache = null;
  }

  async getFeaturedTracks(): Promise<FeaturedTrackDto[]> {
    if (this.tracksCache && this.tracksCache.expiresAtMs > Date.now()) {
      return this.tracksCache.value;
    }

    const promotions = await this.activePromotions(PromotionType.TRACK);
    const tracks = promotions.length
      ? await this.trackRepo.find({
          where: { id: In(promotions.map((p) => p.targetId)) },
          relations: ['authors', 'genre'],
        })
      : [];
    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    const value: FeaturedTrackDto[] = [];
    for (const p of promotions) {
      const t = trackMap.get(p.targetId);
      if (!t) continue;
      value.push({
        promotionId: p.id,
        trackId: t.id,
        title: t.title,
        coverUrl: t.coverUrl ?? null,
        author: (t.authors ?? []).map((a) => a.name).join(', ') || null,
        genre: t.genre?.genre ?? null,
      });
    }

    this.tracksCache = { value, expiresAtMs: Date.now() + CACHE_TTL_MS };
    return value;
  }

  async getFeaturedComposers(): Promise<FeaturedComposerDto[]> {
    if (this.composersCache && this.composersCache.expiresAtMs > Date.now()) {
      return this.composersCache.value;
    }

    const promotions = await this.activePromotions(PromotionType.COMPOSER);
    const composers = promotions.length
      ? await this.userRepo.find({
          where: { id: In(promotions.map((p) => p.targetId)) },
          relations: ['preferredGenres'],
        })
      : [];
    const composerMap = new Map(composers.map((u) => [u.id, u]));

    const value: FeaturedComposerDto[] = [];
    for (const p of promotions) {
      const u = composerMap.get(p.targetId);
      if (!u) continue;
      const lastName = (u as { lastName?: string }).lastName ?? '';
      value.push({
        promotionId: p.id,
        composerId: u.id,
        name: [u.name, lastName].filter(Boolean).join(' ').trim() || u.name,
        avatarUrl: u.avatarUrl ?? null,
        genre: u.preferredGenres?.[0]?.genre ?? null,
      });
    }

    this.composersCache = { value, expiresAtMs: Date.now() + CACHE_TTL_MS };
    return value;
  }

  /** Pautas activas vigentes del tipo, ordenadas por aprobación, limitadas al cupo. */
  private activePromotions(type: PromotionType): Promise<Promotion[]> {
    return this.promotionRepo.find({
      where: { type, status: PromotionStatus.ACTIVE, expiresAt: MoreThan(new Date()) },
      order: { approvedAt: 'DESC', startsAt: 'DESC' },
      take: PROMOTION_SLOTS[type],
    });
  }
}
