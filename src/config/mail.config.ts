import { MailerOptions } from "@nestjs-modules/mailer"
import { join } from "path"
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter"


export const mailConfig: MailerOptions = {

    transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 2525,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
        },
    },
    defaults: {
        from: '"Musila", <no-reply@musila.com>'
    },
    template: {
        dir: join(__dirname, '../mail/templates'),
        adapter: new HandlebarsAdapter(),
        options: {
            strict: true
        }
    }
}