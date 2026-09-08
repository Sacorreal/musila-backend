# CLAUDE.md — musila-backend

Guidance for the NestJS backend. Loaded when working under `musila-backend/`. Estas reglas documentan convenciones que **ya existen en el repo** — el objetivo es que todo módulo nuevo o modificado sea indistinguible en estilo de los que ya están mergeados, no introducir un estándar aparte.

## Estructura de un módulo (SRP)

Un módulo = un dominio/bounded context bajo `src/<dominio>/`, con esta forma (ver `publisher-share/`, `track-notes/`, `requested-tracks/` como referencia):

```
<dominio>/
  entities/*.entity.ts
  dto/*.dto.ts              # DTOs de entrada (Create*/Update*/Find*) y de salida (*ResponseDto)
  guards/*.guard.ts         # solo si el módulo necesita autorización propia más allá de @RequireCapability
  listeners/*.listener.ts   # efectos secundarios reactivos a eventos de otros módulos
  <dominio>.controller.ts
  <dominio>.service.ts
  <dominio>.module.ts
  <dominio>.service.spec.ts
```

Un controller no contiene lógica de negocio: delega todo al service. Un service no conoce HTTP (nada de `Response`/`Request` de Express, ni códigos de estado): lanza excepciones de Nest y el controller/filtro global traducen. Si un service crece para cubrir responsabilidades no relacionadas (p. ej. autorización condicional + persistencia + mapeo a DTO todo en un método gigante), extrae métodos privados por responsabilidad — como se hizo en `track-notes.service.ts` (`assertCanAccessNotes` / `create` / `toResponseDto` separados).

## Respuestas de API: siempre DTO, nunca la entidad de TypeORM

Ningún controller debe retornar (ni declarar como tipo de retorno) una entidad de TypeORM directamente. Siempre un DTO de respuesta explícito. Ya es la convención dominante (`TrackResponseDto`/`PaginatedTracksResponseDto` en `tracks/dto/track-response.dto.ts`, `MyPublisherShareDto`/`PublisherSharePolicyDto` en `publisher-share/`, `TrackNoteResponseDto` en `track-notes/`).

**Por qué**: una entidad expone relaciones anidadas completas, columnas internas (`deletedAt`, FKs de auditoría) y su forma cambia con el esquema de la base de datos — filtrar eso es responsabilidad del backend, no del cliente. Ya se detectó este bug concreto: un controller devolviendo la entidad `TrackNote` cruda rompía el contrato que el frontend esperaba (`trackId`/`authorName`/`authorType` planos en vez de relaciones anidadas).

**Cómo aplicarlo**:
- DTO de respuesta en `dto/*-response.dto.ts`, con `@ApiProperty()` en cada campo.
- Mapeo explícito entidad → DTO: método estático `fromEntity()` en la clase del DTO (`MoodTrackDto`/`ThemeTrackDto`/`TrackAuthorDto`) o mapper privado en el service (`toResponseDto()` en `track-notes.service.ts`). Nunca dejar que el objeto de TypeORM llegue tal cual al `res.json`.
- El controller y el service declaran el tipo de retorno como el DTO (`Promise<TrackResponseDto>`, no `Promise<Track>`), para que un cambio de forma se detecte en compilación.
- Si hace falta recargar relaciones para completar el DTO (p. ej. resolver el nombre de un autor tras un `save()`), hazlo explícito en el service — no asumas que `save()`/`create()` devuelven las relaciones completas ya cargadas.

## Entidades

- Nombres de columna snake_case explícitos vía `@Column({ name: '...' })` / `@JoinColumn({ name: '...' })` — no hay `NamingStrategy` global, así que sin el `name` explícito TypeORM genera camelCase.
- Soft delete por defecto: `@DeleteDateColumn({ name: 'deleted_at', nullable: true })` en toda entidad de negocio (nunca `DELETE` físico salvo limpieza técnica explícita). Los services borran con `softRemove`/`softDelete`, nunca `remove`/`delete`.
- "Actor polimórfico" (una fila puede pertenecer a un `User` o a otra entidad, p. ej. `Guest`): dos relaciones `@ManyToOne` **nullable**, una por tipo posible, en vez de un campo genérico `type` + `id` sin FK. Patrón usado en `WalletEarning.beneficiary`/`beneficiaryOrganization` y en `TrackNote.authorUser`/`authorGuest` — mantiene la integridad referencial de cada rama en vez de perderla en una columna sin constraint.

## Validación de entrada

- Todo body/query se valida con un DTO decorado con `class-validator` (`@IsUUID`, `@IsString`, `@Length`, `@IsInt`, `@Min`, `@IsOptional`, etc.), nunca a mano dentro del controller/service.
- El `ValidationPipe` global (`main.ts`) ya aplica `whitelist: true, forbidNonWhitelisted: true, transform: true` — cualquier campo no declarado en el DTO es rechazado automáticamente; no dupliques esa validación en el service.
- DTOs de query en `GET` (filtros, paginación) son clases igual que los de body (`FindTrackNotesDto`, `FilterTrackDto`), no `@Query('x') x: string` sueltos cuando hay más de un parámetro.

## Autorización (RBAC por capabilities)

- El mecanismo estándar es `@RequireCapability('xxx.yyy')` (o `@RequireCapability([...], 'OR'/'AND')`) sobre la ruta, bajo `@UseGuards(JWTAuthGuard, AuthorizationGuard)`. Antes de inventar un chequeo nuevo, revisa si la capability que necesitas ya existe en el catálogo (`1788200000000-SeedCapabilityCatalog.ts` y las migraciones `Seed*Capabilit*.ts` posteriores) — añadir una nueva capability es una migración pequeña dedicada (ver `1791300000000-SeedEditorialCommandCenterCapability.ts` como plantilla), no una rama de código ad-hoc.
- Cuando la visibilidad/permiso depende de **datos del propio request** (no solo de quién es el usuario) — por ejemplo, si una nota es privada o compartida según si se envía `playlistId` — el decorator de ruta no alcanza: la autorización condicional vive en el **service**, documentando por qué (ver `TrackNotesService.assertCanAccessNotes`). No fuerces ese caso dentro de un guard genérico.
- Antes de reimplementar una cascada de permisos (dueño → colaborador → acceso por enlace compartido, etc.), busca si ya existe un servicio que la resuelve (`PlaylistCollaboratorsService`, `SharingService`, `AuthorizationService.getEffectiveCapabilityKeys`/`.check()`) y reutilízalo — no la copies ni la reinventes (DRY). Si necesitas exactamente la misma cascada que un guard ya implementa, replica su orden exacto y dilo en un comentario (ver referencia a `PlaylistPermissionGuard` en `track-notes.service.ts`).

## Manejo de errores

- Lanza las excepciones estándar de Nest (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`, etc.) desde el service; no captures errores para devolver un objeto `{ error: ... }` a mano.
- El `GlobalExceptionFilter` (`shared/filters/global-exception.filter.ts`, registrado en `main.ts`) ya normaliza toda respuesta de error (`statusCode`, `timestamp`, `path`, `message`) y hace log con `errorId` para excepciones no controladas — no lo dupliques con `try/catch` genéricos en el controller.
- Excepción: un listener de evento (auditoría, notificación, email) nunca debe relanzar ni tumbar la operación de negocio que ya se ejecutó — captura, loguea con `Logger` y sigue (ver `PublisherShareAuditPersistenceListener.handleConfirmed`).

## Migraciones

- `synchronize` es `false` en todos los entornos: todo cambio de entidad requiere `npm run migration:generate -- src/migrations/<Nombre>` (NODE_ENV=local) + revisar el SQL generado + `npm run migration:run`.
- Si el diff generado incluye cambios ajenos a tu entidad (índices/enums/FKs de otras tablas por drift entre el esquema local y las entidades), **no los apliques**: recorta el archivo generado para que contenga solo el SQL de tu cambio, y avisa del drift en vez de "arreglarlo" de paso — es un problema aparte que requiere decisión explícita del equipo.
- Nueva capability de autorización → migración dedicada tipo `Seed<Nombre>Capability.ts`, nunca hardcodeada en un seed script fuera de migraciones.

## Extensibilidad (OCP / DIP): puertos + factory para proveedores intercambiables

Cuando una integración externa puede tener más de una implementación (pasarela de pago, proveedor de timestamping), se modela como un puerto (`interface` en `domain/`) + token de inyección `Symbol` + factory que registra la implementación activa por env var — nunca un `if (provider === 'x')` disperso por la lógica de negocio. Ver `PaymentProvider` (`payments/domain/payment-provider.interface.ts`) + `payment-provider.factory.ts`, y el mismo patrón en `timestamp-provider.factory.ts`. `PaymentsService` depende del puerto, jamás de un SDK concreto — así se agrega un proveedor nuevo sin tocar el service existente.

## Desacoplar efectos secundarios: eventos tipados

Para reacciones a algo que ya pasó (auditoría, notificaciones, sincronización entre módulos) que no deben bloquear ni acoplarse al flujo principal, se emite un evento tipado en vez de inyectar y llamar directamente al servicio del otro dominio:
- Contrato de payloads en `shared/events/contracts/app-event-map.ts` (`AppEventMap`) — cada evento tiene un tipo de payload fijo, no `any`.
- Emisión: `EventBusService.emit('dominio.evento', payload)` (inyectando `EventBusService`, nunca `EventEmitter2` directo).
- Consumo: método decorado con `@EventListener({ event: 'dominio.evento', channel: 'email'|'websocket'|'in-app'|'other' })` en una clase `*.listener.ts` dedicada.

Antes de resolver "cuando pase X, que también pase Y en otro módulo" con una llamada directa a un service ajeno, evalúa si debería ser un evento — mantiene los módulos bajo cambio abierto/cerrado (agregar un listener nuevo no toca el emisor).

## Evitar dependencias circulares entre módulos

Antes de usar `forwardRef`, evalúa si el ciclo se puede evitar reestructurando (extraer el servicio compartido a un tercer módulo, o exportarlo desde el módulo "hoja"). `forwardRef` es aceptable cuando el ciclo es inherente al dominio (ya se usa en el repo), pero no la salida por defecto ante el primer error de dependencia circular.

## Tests

- Un `*.service.spec.ts` junto al service que prueba, cubriendo cada rama de autorización/validación y no solo el camino feliz (ver `track-notes.service.spec.ts`, `wallet-withdrawals.service.spec.ts`).
- Patrón estándar: instanciar el service con `new` pasando mocks manuales de sus dependencias (`{ findOne: jest.fn(), ... }`), **no** `Test.createTestingModule` — es más rápido y evita arrastrar el módulo completo de Nest para una prueba unitaria. Reservar `Test.createTestingModule` para tests de integración que sí necesiten el ciclo de vida real de Nest (guards, interceptors, pipes actuando juntos).

## Nombrado

- Archivos y carpetas en kebab-case (`track-notes.service.ts`, `create-track-note.dto.ts`); clases en PascalCase; DTOs siempre con sufijo `Dto`; el archivo del módulo siempre `<dominio>.module.ts` registrado en `app.module.ts`.
