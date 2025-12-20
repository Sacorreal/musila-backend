import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";


@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly usersService: UsersService
    ) { }

    async sendEmailCollaborationInviteService(
        invitedUserEmail: string,
        hostUserId: string,
    ) {

        const hostUser = await this.usersService.findOneUserByIdService(hostUserId);
        if (!hostUser) throw new NotFoundException('El usuario anfitrión no existe');

        const invitedUser = await this.usersService.findUserByEmailService(invitedUserEmail)
        if (!invitedUser) {
            throw new NotFoundException('El usuario invitado no está registrado en la plataforma');
        }

        const hostName = hostUser.name
        const invitedUserName = invitedUser.name
        const appBaseUrl = `https://musila-develop-flke3.ondigitalocean.app/`
        const acceptInvitationLink = `${appBaseUrl}team`;

        await this.mailerService.sendMail({
            to: invitedUserEmail,
            subject: `🎵 Invitación para unirte al equipo de ${hostName} en Musila`,
            template: './invitationCollaboration',
            context: {
                invitedUserName,
                hostName,
                acceptInvitationLink,
                appBaseUrl
            }
        })
    }

    async sendPasswordResetEmailService(email: string, name: string, resetLink: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: '🔒 Recuperación de contraseña en Musila',
            template: './resetPassword',
            context: {
                name: name || 'Usuario',
                resetLink
            }
        })
    }

    async sendWelcomeEmailService(email: string, name: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: '🎉 ¡Bienvenido a Musila!',
            template: './welcome',
            context: {
                name,
                catalogLink: 'https://musila-develop-flke3.ondigitalocean.app/catalog',
            }
        })
    }

    async sendWelcomeAutorEmailService(email: string, name: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: '🎉 ¡Bienvenido autor a Musila!',
            template: './welcomeAutor',
            context: {
                name,
                uploadSongLink: 'https://musila-develop-flke3.ondigitalocean.app/upload'

            }
        })
    }

    async sendWelcomeCantautorEmailService(email: string, name: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: '🎉 ¡Bienvenido cantautor a Musila!',
            template: './welcomeCantautor',
            context: {
                name,
                catalogLink: 'https://musila-develop-flke3.ondigitalocean.app/catalog',
            }
        })
    }

    async sendRequestTrackService(email: string, name: string, trackTitle: string, authorsNames: string, status: string, isMultipleAuthors: boolean) {

        const authorLabel = isMultipleAuthors ? 'los autores' : 'el autor';

        await this.mailerService.sendMail({
            to: email,
            subject: '🎵 Actualización sobre tu solicitud de pista',
            template: './requestTrackUpdate',
            context: {
                name,
                trackTitle,
                authorsNames,
                status,
                authorLabel
            }

        })
    }

    async sendAuthorRequestNotificationService(authorEmail: string, authorName: string, trackTitle: string, requesterName: string, licenseType: string) {
        await this.mailerService.sendMail({
            to: authorEmail,
            subject: '🎵 Nueva solicitud de pista recibida',
            template: './authorRequestNotification',
            context: {
                authorName,
                trackTitle,
                requesterName,
                licenseType
            }
        })
    }
}