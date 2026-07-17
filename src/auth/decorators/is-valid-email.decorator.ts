import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as dns from 'dns';
import disposableDomains from 'disposable-email-domains';

@ValidatorConstraint({ async: true })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  async validate(email: string) {
    if (!email || !email.includes('@')) return false;

    const domain = email.split('@')[1];

    // 1. Filtrar dominios temporales (sandbox)
    if (disposableDomains.includes(domain)) {
      return false;
    }

    // 2. Verificar existencia de registros MX en el dominio
    try {
      const records = await dns.promises.resolveMx(domain);
      return records && records.length > 0;
    } catch (error) {
      return false; // El dominio no existe o no puede recibir correo
    }
  }

  defaultMessage() {
    return 'El correo es inválido, temporal o inactivo.';
  }
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidEmailConstraint,
    });
  };
}