import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Payment, PaymentType } from './entities/payment.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    paddingVertical: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#7c3aed',
    marginBottom: 28,
  },
  logo: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },
  logoSub: {
    fontSize: 9,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  receiptMeta: {
    alignItems: 'flex-end',
  },
  receiptTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 4,
  },
  receiptRef: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#d1fae5',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#065f46',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountBox: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#e9d5ff',
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  amountCurrency: {
    fontSize: 11,
    color: '#c4b5fd',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#9ca3af',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  rowLast: {
    marginBottom: 0,
  },
  lbl: {
    fontSize: 12,
    color: '#6b7280',
  },
  val: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 3,
  },
});

function getPlanLabel(payment: Payment): string {
  const roleNames: Partial<Record<UserRole, string>> = {
    [UserRole.AUTOR]: 'Autor',
    [UserRole.CANTAUTOR]: 'Cantautor',
    [UserRole.INTERPRETE]: 'Intérprete',
  };
  const roleName = roleNames[payment.roleType] ?? payment.roleType;
  if (payment.paymentType === PaymentType.ONE_TIME) return `${roleName} Pro — Vitalicio`;
  const isAnnual = Number(payment.amount ?? 0) >= 100_000;
  return `${roleName} Pro — ${isAnnual ? 'Anual' : 'Mensual'}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface ReceiptDocProps {
  payment: Payment;
  user: User;
}

export function ReceiptDoc({ payment, user }: ReceiptDocProps) {
  const ref = payment.id.substring(0, 8).toUpperCase();
  const planLabel = getPlanLabel(payment);
  const dateStr = formatDate(payment.createdAt);
  const expiresStr = payment.expiresAt ? formatDate(payment.expiresAt) : null;
  const amount = formatCurrency(Number(payment.amount ?? 0));
  const clientName = [user.name, user.secondName, user.lastName, user.secondLastName]
    .filter(Boolean)
    .join(' ');

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.logo}>musila</Text>
            <Text style={S.logoSub}>Plataforma de Licencias Musicales</Text>
          </View>
          <View style={S.receiptMeta}>
            <Text style={S.receiptTitle}>Comprobante de Pago</Text>
            <Text style={S.receiptRef}>Referencia: {ref}</Text>
            <View style={S.badge}>
              <Text style={S.badgeText}>Aprobado</Text>
            </View>
          </View>
        </View>

        <View style={S.amountBox}>
          <Text style={S.amountLabel}>Total Pagado</Text>
          <Text style={S.amountValue}>{amount}</Text>
          <Text style={S.amountCurrency}>Pesos Colombianos (COP)</Text>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Información del Cliente</Text>
          <View style={S.row}>
            <Text style={S.lbl}>Nombre</Text>
            <Text style={S.val}>{clientName}</Text>
          </View>
          <View style={[S.row, S.rowLast]}>
            <Text style={S.lbl}>Correo electrónico</Text>
            <Text style={S.val}>{user.email}</Text>
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Detalle del Servicio</Text>
          <View style={S.row}>
            <Text style={S.lbl}>Plan adquirido</Text>
            <Text style={S.val}>{planLabel}</Text>
          </View>
          <View style={expiresStr ? S.row : [S.row, S.rowLast]}>
            <Text style={S.lbl}>Fecha de pago</Text>
            <Text style={S.val}>{dateStr}</Text>
          </View>
          {expiresStr && (
            <View style={[S.row, S.rowLast]}>
              <Text style={S.lbl}>Válido hasta</Text>
              <Text style={S.val}>{expiresStr}</Text>
            </View>
          )}
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Transacción</Text>
          <View style={S.row}>
            <Text style={S.lbl}>Referencia interna</Text>
            <Text style={S.val}>{ref}</Text>
          </View>
          {payment.wompiTransactionId && (
            <View style={S.row}>
              <Text style={S.lbl}>ID Wompi</Text>
              <Text style={S.val}>#{payment.wompiTransactionId}</Text>
            </View>
          )}
          <View style={[S.row, S.rowLast]}>
            <Text style={S.lbl}>Procesado por</Text>
            <Text style={S.val}>Wompi</Text>
          </View>
        </View>

        <View style={S.footer}>
          <Text style={S.footerText}>musila.com — Plataforma de Licencias Musicales</Text>
          <Text style={S.footerText}>
            Este comprobante es generado automáticamente y tiene validez como constancia de pago.
          </Text>
          <Text style={S.footerText}>Para soporte escríbenos a soporte@musila.com</Text>
        </View>
      </Page>
    </Document>
  );
}
