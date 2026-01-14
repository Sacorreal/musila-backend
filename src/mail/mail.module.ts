import { MailerModule } from "@nestjs-modules/mailer";
import { Module } from "@nestjs/common";
import { mailConfig } from "src/config/mail.config";
import { MailService } from "./mail.service";
import { MailController } from "./mail.controller";
import { UsersModule } from "src/users/users.module";


@Module({
    imports: [MailerModule.forRoot(mailConfig), UsersModule],
    controllers: [MailController],
    providers: [MailService],
    exports: [MailService]
})
export class MailModule { }