import { registerEnumType } from "@nestjs/graphql";

export enum UserRole {
  ADMIN = 'admin',
  AUTOR = 'autor',
  INTERPRETE = 'interprete',
  CANTAUTOR = 'cantautor',
  INVITADO = 'invitado',
  EDITOR = 'editor',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Roles de los usuarios'
})