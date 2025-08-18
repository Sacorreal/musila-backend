import { registerEnumType } from "@nestjs/graphql";

export enum LicenseType {
    LICENCIA_DE_PRIMER_USO = 'licencia_de_primer_uso',
    LICENCIA_TRADUCCION = 'licencia_traduccion',
    LICENCIA_REPRODUCCION = 'licencia_reproduccion',
    LICENCIA_SINCRONIZACION = 'licencia_sincronizacion'
}

registerEnumType(LicenseType, {
    name: 'LicenseType',
    description: 'Tipo de Licencia'
})