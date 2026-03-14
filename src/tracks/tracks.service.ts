import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { Track } from './entities/track.entity';
import type { PaginatedTracks } from './interface/paginated-tracks.interface';
import { FindAllTracksOptions } from './interface/tracks-options.interface';

const tracksRelations: string[] = [
  'genre',
  'intellectualProperties',
  'authors',
  'playlists',
  'requestedTrack',
];

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private readonly tracksRepository: Repository<Track>,
    @InjectRepository(MusicalGenre)
    private readonly genreRepository: Repository<MusicalGenre>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,

  ) { }

  private async findTrackWithRelations(id: string): Promise<Track> {
    const track = await this.tracksRepository.findOne({
      where: { id },
      relations: tracksRelations,
    });

    if (!track) throw new NotFoundException('El track no existe');

    return track;
  }

  private async saveAndReturnWithRelations(track: Track): Promise<Track> {
    const savedTrack = await this.tracksRepository.save(track);
    return this.findTrackWithRelations(savedTrack.id);
  }

  async createTrackService(
    createTrackInput: CreateTrackInput,
  ): Promise<Track> {
    const {
      genreId,
      subGenre,
      authorsIds,
      audioKey,
      audioUrl,
      coverKey,
      coverUrl,
      externalsIds,
      ...rest
    } = createTrackInput;

    // =============================
    // 1️⃣ Validar género
    // =============================

    const genre = await this.genreRepository.findOne({
      where: { id: genreId },
    });

    if (!genre)
      throw new NotFoundException(
        'El género musical no existe',
      );

    // Si el cliente envía un subgénero, lo validamos contra la lista del género.
    // Si no envía subgénero, no forzamos validación ni bloqueamos la creación.
    if (subGenre) {
      if (genre.subGenre && genre.subGenre.length > 0) {
        const isValidSubGenre = genre.subGenre.some(
          (sg) => sg.toLowerCase() === subGenre.toLowerCase(),
        );

        if (!isValidSubGenre) {
          throw new BadRequestException(
            `El subgénero "${subGenre}" no pertenece al género "${genre.genre}". ` +
            `Los subgéneros válidos son: ${genre.subGenre.join(', ')}.`,
          );
        }
      } else {
        throw new BadRequestException(
          `El género "${genre.genre}" no tiene subgéneros definidos para asociar un subgénero.`,
        );
      }
    }

    // =============================
    // 2️⃣ Validar autores
    // =============================

    const authors = await this.usersRepository.find({
      where: { id: In(authorsIds) },
    });

    if (authors.length !== authorsIds.length) {
      throw new NotFoundException(
        'Uno o más autores no existen',
      );
    }

    // =============================
    // 3️⃣ Validar que venga audio
    // =============================

    if (!audioKey || !audioUrl) {
      throw new BadRequestException(
        'El archivo de audio es obligatorio',
      );
    }

    // =============================
    // 4️⃣ Crear entidad
    // =============================

    const newTrack = this.tracksRepository.create({
      ...rest,
      genre,
      subGenre,
      authors,
      audioKey,
      audioUrl,
      externalsIds,
      coverKey: coverKey ?? null,
      year: new Date().getFullYear(),
      coverUrl: coverUrl ?? null,
    } as any);

    return await this.saveAndReturnWithRelations(newTrack as unknown as Track);
  }

  async findMyTracksService(user: JwtPayload) {
     const [tracks, total] = await this.tracksRepository.findAndCount({
      where: {
        authors: { id: user.id },
      },
    });
    return {
      tracks,
      total,
    };
  }
  
  



  async findAllTracksService(
    options: FindAllTracksOptions = {},
    user: JwtPayload
  ): Promise<PaginatedTracks> {
    const { 
      limit, 
      offset, 
      isGospel, 
      language, 
      subGenre, 
      genreId, 
      isAvailable = true 
    } = options.params ?? {};

    // 1. Determinar si el usuario tiene acceso a todas las canciones (RBAC)
    const hasGlobalAccess = [
      UserRole.ADMIN, 
      UserRole.INTERPRETE, 
      UserRole.CANTAUTOR,
      UserRole.INVITADO
    ].includes(user?.role);

    // 2. Construcción limpia del Query Object
    const where: FindOptionsWhere<Track> = {
      isAvailable,
      ...(isGospel !== undefined && { isGospel }),
      ...(language && { language }),
      ...(subGenre && { subGenre }),
      ...(genreId && { genre: { id: genreId } }),
      // 3. Restricción de propietario: Si NO tiene acceso global, filtra por su ID
      ...(!hasGlobalAccess && user && { authors: { id: user.id } }),
    };

    // 4. Ejecución de la consulta
    const [tracks, total] = await this.tracksRepository.findAndCount({
      where,
      take: limit,
      skip: offset,
    });

    return {
      data: tracks,
      total,
    };
  }

  async findOneTrackService(id: string) {
    return await this.findTrackWithRelations(id);
  }

  async updateTrackService(id: string, updateTrackInput: UpdateTrackInput) {
    const existingTrack = await this.findTrackWithRelations(id);

    const { genreId, authorsIds, ...rest } = updateTrackInput;

    Object.assign(existingTrack, rest);

    if (genreId) {
      const genre = await this.genreRepository.findOne({
        where: { id: genreId },
      });
      if (!genre) throw new NotFoundException('El género musical no existe');
      existingTrack.genre = genre;
    }

    if (authorsIds) {
      const authors = await this.usersRepository.find({
        where: { id: In(authorsIds) },
      });

      if (authors.length !== authorsIds.length)
        throw new NotFoundException('Uno o más autores no existen');
      existingTrack.authors = authors;
    }

    return await this.saveAndReturnWithRelations(existingTrack);
  }

  async removeTrackService(id: string) {
    const result = await this.tracksRepository.softDelete(id);
    if (result.affected === 0){
      throw new NotFoundException('El track no existe')   }

    return {
      id, 
      message:'Track eliminado correctamente'
    }
  }

 
}
