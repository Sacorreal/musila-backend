import { registerDecorator, ValidationOptions } from 'class-validator';

/** Formato CISAC del IPI Name Number: 9 a 11 dígitos numéricos. */
export const IPI_NUMBER_REGEX = /^\d{9,11}$/;

/** Valida que el campo sea un número IPI (CISAC) con formato internacional válido. */
export function IsIpiNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIpiNumber',
      target: object.constructor,
      propertyName,
      options: {
        message: 'El número IPI debe tener entre 9 y 11 dígitos numéricos',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && IPI_NUMBER_REGEX.test(value);
        },
      },
    });
  };
}
