/** Enmascara un email para no exponer PII completa de un referido a un tercero (ej. "j***@gmail.com"). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
