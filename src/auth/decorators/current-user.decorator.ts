import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from 'src/users/entities/user-role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (roles: UserRole[] | undefined, context: ExecutionContext): JwtPayload => {
    const ctx = GqlExecutionContext.create(context);
    const user: JwtPayload = ctx.getContext().req.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException(`User role '${user.role}' not authorized`);
    }

    return user;
  },
);
