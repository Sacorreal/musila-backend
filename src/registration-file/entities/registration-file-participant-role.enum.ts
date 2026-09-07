/**
 * Rol legal del participante para efectos de registro ante SAYCO/DNDA.
 * Distinto de `CoauthorRole` (splits): ese modela roles de reparto de
 * regalías entre usuarios de la plataforma; este modela roles de una
 * declaración de autoría/edición que puede incluir terceros sin cuenta
 * Musila (editores, administradores). `COMPOSITOR_AUTOR` se agrega para
 * representar fielmente el valor "CA" (Compositor/Autor) del formulario
 * PMDO-FO04 de SAYCO.
 */
export enum RegistrationFileParticipantRole {
  AUTOR = 'autor',
  COMPOSITOR = 'compositor',
  COMPOSITOR_AUTOR = 'compositor_autor',
  ARREGLISTA = 'arreglista',
  ADAPTADOR = 'adaptador',
  EDITOR = 'editor',
  ADMINISTRADOR = 'administrador',
}
