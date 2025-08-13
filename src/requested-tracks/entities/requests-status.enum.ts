import { registerEnumType } from "@nestjs/graphql";


export enum RequestsStatus {
    APROBADA = 'aprobada',
    RECHAZADA = 'rechazada',
    PENDIENTE = 'pendiente'
}

registerEnumType(RequestsStatus, { name: 'RequestsStatus', description: 'Estado de las peticiones' })
