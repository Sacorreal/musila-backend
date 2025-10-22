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
        email: string,
        invitedUserName: string,
        hostUserId: string,
    ) {

        const hostUser = await this.usersService.findOneUserByIdService(hostUserId);

        if (!hostUser) throw new NotFoundException('El usuario anfitrión no existe');

        const hostUserName = hostUser.name
        const acceptInvitationLink = `https://musila-develop-flke3.ondigitalocean.app/`
        const musilaAppLink = 'https://musila-develop-flke3.ondigitalocean.app/'

        await this.mailerService.sendMail({
            to: email,
            subject: `🎵 Invitación a colaborar en ${hostUserName} en Musila`,
            template: './invitation',
            context: {
                invitedUserName,
                hostUserName,
                hostMusilaEmail: 'info@musila.co',
                acceptInvitationLink,
                musilaAppLink
            }
        })
    }
}