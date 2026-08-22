import { MigrationInterface, QueryRunner } from 'typeorm';

type CmoSeedRow = [
  acronym: string,
  officialName: string,
  country: string,
  isoCountryCode: string,
  cisacSocietyId: string | null,
];

/**
 * Siembra el catálogo maestro (§3, §6) a partir del contenido curado de
 * `global_copyright_cmo.json` (40 sociedades, con `cisacCode` ya poblado
 * desde datos reales de CISAC/reprtoir.com en una tarea previa). Se
 * transcribe aquí de forma self-contained — la migración no debe depender
 * del build del frontend.
 *
 * Dos correcciones de calidad de datos respecto al JSON original, hechas al
 * transcribir (el JSON de referencia no se modifica, solo esta copia):
 * - SAYCE ("...del Ecuador") tenía `country: "VE"` en el JSON (bug de
 *   copy-paste de la fila SACVEN inmediatamente anterior) → aquí "EC".
 * - UBC ("União Brasileira de Compositores") tenía `country: "PA"` en el
 *   JSON → aquí "BR".
 */
export class SeedCollectiveManagementSocietyCatalog1790400000000 implements MigrationInterface {
  name = 'SeedCollectiveManagementSocietyCatalog1790400000000';

  private readonly rows: CmoSeedRow[] = [
    ['SAYCO', 'Sociedad de Autores y Compositores de Colombia', 'Colombia', 'CO', '84'],
    ['SACM', 'Sociedad de Autores y Compositores de México', 'México', 'MX', '59'],
    ['SADAIC', 'Sociedad Argentina de Autores y Compositores de Música', 'Argentina', 'AR', '61'],
    ['ARGENTORES', 'Argentores - Sociedad General de Autores de la Argentina', 'Argentina', 'AR', '14'],
    ['ABRAMUS', 'Associação Brasileira de Música e Artes', 'Brasil', 'BR', '201'],
    ['ACAM', 'Asociación de Compositores y Autores Musicales de Costa Rica', 'Costa Rica', 'CR', '107'],
    ['ACCS', 'Association of Caribbean Copyright Societies', 'Trinidad y Tobago', 'TT', '306'],
    ['ACDAM', 'Agencia de Creadores Dramáticos, Audiovisuales y Musicales', 'Cuba', 'CU', '103'],
    ['ADDAF', 'Associação Defensora de Direitos Autorais', 'Brasil', 'BR', '2'],
    ['AEI-GUATEMALA', 'Asociación de Autores, Editores e Intérpretes', 'Guatemala', 'GT', '250'],
    ['AGADU', 'Asociación General de Autores del Uruguay', 'Uruguay', 'UY', '4'],
    ['AMAR SOMBRÁS', 'Associação de Músicos Arranjadores e Regentes / Sociedade Musical Brasileira', 'Brasil', 'BR', '30'],
    ['APA', 'Autores Paraguayos Asociados', 'Paraguay', 'PY', '15'],
    ['APDAYC', 'Asociación Peruana de Autores Y Compositores', 'Perú', 'PE', '7'],
    ['ASSIM', 'Associação de Intérpretes e Músicos', 'Brasil', 'BR', '219'],
    ['COSCAP', 'Copyright Society of Composers, Authors and Publishers Incorporated', 'Barbados', 'BB', '169'],
    ['COTT', 'Copyright Organisation of Trinidad and Tobago', 'Trinidad y Tobago', 'TT', '96'],
    ['ECCO', 'Eastern Caribbean Collective Organisation for Music Rights Inc.', 'Santa Lucía', 'LC', '214'],
    ['JACAP', 'Jamaica Association of Composers,Authors and Publishers Ltd', 'Jamaica', 'JM', '176'],
    ['SACIM-EGC', 'Salvadoreños Autores, Compositores e Interpretes Musicales, Entidad de Gestión Colectiva', 'El Salvador', 'SV', '242'],
    ['SACVEN', 'Sociedad de Autores y Compositores de Venezuela', 'Venezuela', 'VE', '60'],
    ['SAYCE', 'Sociedad General de Autores y Compositores del Ecuador', 'Ecuador', 'EC', '65'],
    ['SBACEM', 'Sociedade Brasileira de Autores, Compositores e Escritores de Musica', 'Brasil', 'BR', '66'],
    ['SCD', 'Sociedad Chilena de Autores e Intérpretes Musicales', 'Chile', 'CL', '29'],
    ['SGACEDOM', 'Sociedad General de Autores, Compositores y Editores Dominicanos de Musica', 'República Dominicana', 'DO', '227'],
    ['SICAM', 'Sociedade Independente de Compositores e Autores Musicais', 'Brasil', 'BR', '86'],
    ['SOBODAYCOM', 'Sociedad Boliviana de Autores y Compositores de Música', 'Bolivia', 'BO', '129'],
    ['SOCINPRO', 'Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais', 'Brasil', 'BR', '189'],
    ['SPAC', 'Sociedad Panameña de Autores y Compositores', 'Panamá', 'PA', '146'],
    ['UBC', 'União Brasileira de Compositores', 'Brasil', 'BR', '93'],
    ['AMRA', 'American Music Rights Association', 'Estados Unidos de América', 'US', '17'],
    ['ASCAP', 'American Society of Composers,Authors and Publishers', 'Estados Unidos de América', 'US', '10'],
    ['SOCAN', 'Society of Composers, Authors and Music Publishers of Canada', 'Canadá', 'CA', '101'],
    ['SPACQ-AE', 'Société professionnelle des auteurs, compositeurs du Québec et des artistes entrepreneurs', 'Canadá', 'CA', '191'],
    ['The MLC', 'Mechanical Licensing Collective', 'Estados Unidos de América', 'US', '708'],
    ['BMI', 'Broadcast Music, Inc.', 'Estados Unidos de América', 'US', '21'],
    ['GMR', 'Global Music Rights', 'Estados Unidos de América', 'US', '778'],
    ['HFA', 'The Harry Fox Agency', 'Estados Unidos de América', 'US', '34'],
    ['MRI', 'Music Reports', 'Estados Unidos de América', 'US', null],
    ['SESAC', 'Sociedad de Autores y Compositores Europeos', 'Estados Unidos de América', 'US', '71'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = this.rows
      .map(([acronym, officialName, country, isoCountryCode, cisacSocietyId]) => {
        const cisac = cisacSocietyId === null ? 'NULL' : `'${this.escape(cisacSocietyId)}'`;
        return `('${this.escape(acronym)}', '${this.escape(officialName)}', '${this.escape(country)}', '${isoCountryCode}', ${cisac}, 'CMO', 'ACTIVE')`;
      })
      .join(',\n        ');

    await queryRunner.query(`
      INSERT INTO "collective_management_societies"
        ("acronym", "official_name", "country", "iso_country_code", "cisac_society_id", "organization_type", "status")
      VALUES
        ${values}
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const acronyms = this.rows.map(([acronym]) => `'${this.escape(acronym)}'`).join(', ');
    await queryRunner.query(`DELETE FROM "collective_management_societies" WHERE "acronym" IN (${acronyms})`);
  }

  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}
