
import { ApiProperty } from "@nestjs/swagger";
import { RequestsStatus } from "../entities/requests-status.enum";

export class RequestsStatusDto {

    @ApiProperty({
        description: 'Estado de la solicitud',
        enum: RequestsStatus,
        example: RequestsStatus.PENDIENTE
    })
    status: RequestsStatus
}