/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthenticatedSocket } from './types/realtime.types';

@Injectable()
export class SocketAuthService {
    private readonly logger = new Logger(SocketAuthService.name);

    constructor(private readonly jwtService: JwtService) { }

    async authenticate(client: Socket): Promise<JwtPayload | null> {
        try {
            const token = this.extractToken(client);

            if (!token) {
                this.reject(client, 'Token no encontrado');
                return null;
            }

            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

            (client as any).data = { user: payload };

            this.logger.log(
                `✅ Socket autenticado: ${payload.name} (${payload.id})`,
            );

            return payload;
        } catch {
            this.reject(client, 'Token inválido');
            return null;
        }
    }

    onDisconnect(client: Socket) {
        const user = (client as any).data?.user;
        this.logger.log(
            `❌ Cliente desconectado: ${client.id} ${user ? `(${user.name})` : ''
            }`,
        );
    }

    /** Obtiene el JwtPayload almacenado en el socket tras la autenticación */
    getUserFromSocket(client: Socket): JwtPayload | null {
        return (client as unknown as AuthenticatedSocket).data?.user ?? null;
    }

    private extractToken(client: Socket): string | undefined {
        const authToken = client.handshake.auth?.token;
        if (authToken) return authToken;

        const header = client.handshake.headers?.authorization;
        if (header) {
            const [type, token] = header.split(' ');
            if (type === 'Bearer') return token;
        }

        return undefined;
    }

    private reject(client: Socket, message: string) {
        this.logger.warn(`🚫 ${message}`);
        client.emit('auth.error', { message });
        client.disconnect(true);
    }
}