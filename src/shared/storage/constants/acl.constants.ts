import { ObjectCannedACL } from '@aws-sdk/client-s3';

/**
 * Constantes de ACL válidas para objetos en S3 (DigitalOcean Spaces)
 * Usamos `as const` para preservar los literales y mantener tipado estricto
 */
export const ACL = {
  PRIVATE: 'private',
  PUBLIC_READ: 'public-read',
  PUBLIC_READ_WRITE: 'public-read-write',
  AUTHENTICATED_READ: 'authenticated-read',
  AWS_EXEC_READ: 'aws-exec-read',
  BUCKET_OWNER_READ: 'bucket-owner-read',
  BUCKET_OWNER_FULL_CONTROL: 'bucket-owner-full-control',
} as const satisfies Record<string, ObjectCannedACL>;

/**
 * Tipo auxiliar para usar en DTOs, servicios o tests
 * Equivale a `ObjectCannedACL` pero derivado de nuestras constantes
 */
export type ACLValues = (typeof ACL)[keyof typeof ACL];
