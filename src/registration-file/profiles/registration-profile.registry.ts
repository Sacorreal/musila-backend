import { Injectable } from '@nestjs/common';
import { RegistrationProfileKey } from '../entities/registration-profile-key.type';
import { RegistrationProfile } from '../validation-engine/registration-profile.interface';
import { SaycoRegistrationProfile } from './sayco/sayco-registration-profile';
import { DndaRegistrationProfile } from './dnda/dnda-registration-profile';

/**
 * Registro de los `RegistrationProfile` disponibles (Strategy en código).
 * Agregar un perfil nuevo (Editorial, Distribuidora) es agregarlo aquí y a
 * `RegistrationFileModule.providers` — no requiere tocar el `ValidationEngine`
 * ni el modelo de datos.
 */
@Injectable()
export class RegistrationProfileRegistry {
  private readonly profilesByKey: Record<RegistrationProfileKey, RegistrationProfile>;

  constructor(saycoProfile: SaycoRegistrationProfile, dndaProfile: DndaRegistrationProfile) {
    this.profilesByKey = {
      SAYCO: saycoProfile,
      DNDA: dndaProfile,
    };
  }

  getActiveProfiles(activeProfileKeys: string[]): RegistrationProfile[] {
    return activeProfileKeys
      .map((key) => this.profilesByKey[key as RegistrationProfileKey])
      .filter((profile): profile is RegistrationProfile => !!profile);
  }
}
