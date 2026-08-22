import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { LegalIdentity } from './entities/legal-identity.entity';
import { LegalIdentityCipherService } from './crypto/legal-identity-cipher.service';
import { UpsertLegalIdentityDto } from './dto/upsert-legal-identity.dto';
import { LegalIdentificationType } from './legal-identification-type.enum';

export interface LegalIdentityData {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoIdentificacion: LegalIdentificationType;
  numeroIdentificacion: string;
  fechaExpedicion: string;
  numeroCelular: string;
  indicativoPais: string;
  identidadLegalVerificada: boolean;
  verifiedAt: Date | null;
}

/** Snapshot descifrado embebido en cada firma electrónica, para trazabilidad probatoria (§7). */
export interface LegalIdentitySnapshotPayload {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoIdentificacion: LegalIdentificationType;
  numeroIdentificacion: string;
  fechaExpedicion: string;
  numeroCelular: string;
  indicativoPais: string;
  capturedAt: string;
}

@Injectable()
export class LegalIdentityService {
  constructor(
    @InjectRepository(LegalIdentity)
    private readonly legalIdentityRepo: Repository<LegalIdentity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cipher: LegalIdentityCipherService,
  ) {}

  /** Único lookup por PK — usado por los guards de servidor (presupuesto de 200ms). */
  async isVerified(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'identidadLegalVerificada'],
    });
    return Boolean(user?.identidadLegalVerificada);
  }

  async getDecryptedByUserId(userId: string): Promise<LegalIdentityData | null> {
    const [entity, user] = await Promise.all([
      this.legalIdentityRepo.findOne({ where: { userId } }),
      this.userRepo.findOne({ where: { id: userId }, select: ['id', 'identidadLegalVerificada'] }),
    ]);
    if (!entity) return null;

    return {
      ...this.decrypt(entity),
      identidadLegalVerificada: Boolean(user?.identidadLegalVerificada),
      verifiedAt: entity.verifiedAt ?? null,
    };
  }

  /**
   * Crea o actualiza la identidad legal del usuario. La validación de formato
   * y completitud ya corrió en `UpsertLegalIdentityDto` (class-validator) antes
   * de llegar aquí — una solicitud inválida se rechaza con 400 sin persistir
   * nada, por lo que `identidadLegalVerificada` nunca queda en un estado a
   * medio escribir.
   */
  async upsert(userId: string, dto: UpsertLegalIdentityDto): Promise<LegalIdentityData> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    let entity = await this.legalIdentityRepo.findOne({ where: { userId } });
    const now = new Date();

    entity = this.legalIdentityRepo.create({
      ...entity,
      userId,
      primerNombreEncrypted: this.cipher.encrypt(dto.primerNombre.trim()),
      segundoNombreEncrypted: this.cipher.encrypt(dto.segundoNombre.trim()),
      primerApellidoEncrypted: this.cipher.encrypt(dto.primerApellido.trim()),
      segundoApellidoEncrypted: this.cipher.encrypt(dto.segundoApellido.trim()),
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacionEncrypted: this.cipher.encrypt(dto.numeroIdentificacion.trim()),
      fechaExpedicionEncrypted: this.cipher.encrypt(dto.fechaExpedicion),
      numeroCelularEncrypted: this.cipher.encrypt(dto.numeroCelular.trim()),
      indicativoPais: dto.indicativoPais,
      verifiedAt: now,
    });
    const saved = await this.legalIdentityRepo.save(entity);

    user.identidadLegalVerificada = true;
    await this.userRepo.save(user);

    return {
      ...this.decrypt(saved),
      identidadLegalVerificada: true,
      verifiedAt: saved.verifiedAt ?? null,
    };
  }

  /** Construye el snapshot cifrado vinculado a una firma electrónica puntual (§7). */
  async buildEncryptedSnapshot(userId: string): Promise<string> {
    const entity = await this.legalIdentityRepo.findOne({ where: { userId } });
    if (!entity) {
      throw new NotFoundException('El usuario no tiene una identidad legal registrada');
    }

    const payload: LegalIdentitySnapshotPayload = {
      ...this.decrypt(entity),
      capturedAt: new Date().toISOString(),
    };
    return this.cipher.encrypt(JSON.stringify(payload));
  }

  /** Descifra un snapshot previamente construido con {@link buildEncryptedSnapshot}. */
  decryptSnapshot(serialized: string): LegalIdentitySnapshotPayload {
    return JSON.parse(this.cipher.decrypt(serialized)) as LegalIdentitySnapshotPayload;
  }

  private decrypt(entity: LegalIdentity): Omit<LegalIdentityData, 'identidadLegalVerificada' | 'verifiedAt'> {
    return {
      primerNombre: this.cipher.decrypt(entity.primerNombreEncrypted),
      segundoNombre: this.cipher.decrypt(entity.segundoNombreEncrypted),
      primerApellido: this.cipher.decrypt(entity.primerApellidoEncrypted),
      segundoApellido: this.cipher.decrypt(entity.segundoApellidoEncrypted),
      tipoIdentificacion: entity.tipoIdentificacion,
      numeroIdentificacion: this.cipher.decrypt(entity.numeroIdentificacionEncrypted),
      fechaExpedicion: this.cipher.decrypt(entity.fechaExpedicionEncrypted),
      numeroCelular: this.cipher.decrypt(entity.numeroCelularEncrypted),
      indicativoPais: entity.indicativoPais,
    };
  }
}
