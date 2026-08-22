import { Guest } from 'src/guests/entities/guest.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPlanType } from './user-plan-type.enum';
import { MusicRole } from './music-role.enum';
import { UserPlan } from './user-plan.enum';
import { ProSociety } from './pro-society.enum';
import { SocialNetworksData } from './social-networks.type';

export interface UserBankAccount {
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName: string;
  accountHolderIdType: string;
  accountHolderIdNumber: string;
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, nullable: true, name: 'second_name' })
  secondName?: string

  @Column('varchar', { name: 'last_name' })
  lastName: string;

  @Column('varchar', { length: 255, nullable: true, name: 'last_second_name' })
  secondLastName?: string

  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @Column('varchar', { name: 'musila_creator_id', unique: true })
  musilaCreatorId: string;

  @Column('varchar', { nullable: false, select: false })
  password: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode: string;

  @Column('varchar', { nullable: true })
  phone: string;

  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  typeCitizenID?: string;

  @Column({ name: 'citizen_id', nullable: true })
  citizenID?: string;

  @Column({
    type: 'enum',
    enum: UserPlanType,
    default: UserPlanType.INVITADO,
    name: 'plan_type',
  })
  planType: UserPlanType;

  @Column({ type: 'enum', enum: MusicRole, default: MusicRole.COMPOSITOR })
  role: MusicRole;

  @Column('varchar', { name: 'avatar', nullable: true })
  avatarUrl?: string;

  @Column('varchar', { nullable: true, name: 'avatar_key' })
  avatarKey?: string

  @Column('boolean', { default: false, name: 'is_verified' })
  isVerified: boolean;

  /**
   * Identidad legal verificada (Ley 527): gate para firmar splits y reproducir
   * canciones de terceros. Los datos detallados viven en `LegalIdentity`
   * (relación 1:1, ver `legal-identity` module); esta bandera vive aquí para
   * que los guards la consulten con un solo lookup por PK (<200ms).
   */
  @Column('boolean', { default: false, name: 'identidad_legal_verificada' })
  identidadLegalVerificada: boolean;

  @Column('text', { nullable: true })
  biography?: string;

  @Column('jsonb', { name: 'social_networks', nullable: true })
  socialNetworks?: SocialNetworksData;

  @Column('jsonb', { name: 'bank_account', nullable: true })
  bankAccount?: UserBankAccount;

  @ManyToMany(() => Track, (track) => track.authors, { nullable: true })
  tracks?: Track[];

  @ManyToMany(() => MusicalGenre, { nullable: true })
  @JoinTable({
    name: 'user_preferred_genres',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'genre_id' },
  })
  preferredGenres?: MusicalGenre[];

  @OneToMany(() => Guest, (guest) => guest.invited_by, { nullable: true })
  guests?: Guest[];

  @OneToMany(() => Playlist, (playlist) => playlist.owner, {
    nullable: true,
  })
  playlists?: Playlist[];

  @OneToMany(
    () => RequestedTrack,
    (requestedTrack) => requestedTrack.requester,
    { nullable: true },
  )
  requestSent?: RequestedTrack[];

  @OneToMany(
    () => RequestedTrack,
    (requestedTrack) => requestedTrack.owner,
    { nullable: true }
  )
  requestReceived?: RequestedTrack[]

  @OneToMany(() => Notification, (notification) => notification.recipient, {
    nullable: true,
  })
  notifications?: Notification[];

  @Column({ type: 'enum', enum: UserPlan, default: UserPlan.FREE })
  plan: UserPlan;

  @Column('timestamptz', { nullable: true, name: 'plan_expires_at' })
  planExpiresAt?: Date;

  @Column('varchar', { nullable: true, name: 'fiscal_name' })
  fiscalName?: string;

  @Column('varchar', { nullable: true, name: 'tax_id' })
  taxId?: string;

  @Column('varchar', { nullable: true, name: 'fiscal_address' })
  fiscalAddress?: string;

  @Column('varchar', { nullable: true, name: 'pro_society' })
  proSociety?: ProSociety;

  @Column('varchar', { nullable: true, name: 'ipi_number' })
  ipiNumber?: string;

  @Column('varchar', { nullable: true, name: 'publisher' })
  publisher?: string;

  @Column('varchar', { nullable: true, name: 'reset_token', select: false })
  resetToken?: string;

  @Column('timestamp', { nullable: true, name: 'reset_token_expires' })
  resetTokenExpires?: Date;

  @Column('varchar', { nullable: true, name: 'email_verification_token', select: false })
  emailVerificationToken?: string;

  @Column('timestamp', { nullable: true, name: 'email_verification_token_expires' })
  emailVerificationTokenExpires?: Date;

  @Column('uuid', { nullable: true, name: 'referred_by_affiliate_id' })
  referredByAffiliateId?: string;

  @Column('timestamptz', { nullable: true, name: 'referred_at' })
  referredAt?: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
