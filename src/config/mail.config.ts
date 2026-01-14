import * as dotenv from "dotenv"
import { MailerOptions } from "@nestjs-modules/mailer"
import { join } from "path"
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter"


dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

export const mailConfig: MailerOptions = {

    transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
        },
    },
    defaults: {
        from: process.env.MAIL_FROM
    },
    template: {
        dir: join(__dirname, '../mail/templates'),
        adapter: new HandlebarsAdapter(),
        options: {
            strict: true
        }
    }
}