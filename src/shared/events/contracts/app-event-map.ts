import { LicenseType } from "src/requested-tracks/entities/license-type.enum";
import { UserPlanType } from "src/users/entities/user-plan-type.enum";
import { UserPlan } from "src/users/entities/user-plan.enum";
import { BillingPeriod, PaymentType } from "src/payments/entities/payment.entity";

export interface AppEventMap {
  // 👥 INVITES
  'invite.created': {
    email: string;
    token: string;
    invitedByName: string;
    guestName: string;
    inviteUrl: string;
  };

  'invite.accepted': {
    invitedById: string;
    playlistID: string;
  };

  // 🎵 PLAYLIST
  'playlist.updated': {
    playlistId: string;
    playlistTitle: string;
    updatedBy: string;
    changes: string[];
  };

  'playlist.user.added': {
    playlistId: string;
    playlistTitle: string;
    guestId: string;
    guestName: string;
    guestEmail: string;
    permission: string;
    addedBy: string;
  };

  // 👤 USER
  'user.invite.created': {
    name: string;
    email: string;
  };

  'user.password.reset.requested': {
    email: string;
    token: string;
    name: string;
  };

  'user.password.changed': {
    email: string;
    name: string;
  };

  'user.email.verification.requested': {
    email: string;
    name: string;
    token: string;
  };

  'event-test': {
    message: string;
  };

  //💬 CHAT 

  'chat.message.sent': {
    chatId: string;
    messageId: string;
    senderId?: string;
    content: string;
    type: string;
    titleTrack: string;
    fileUrl?: string;
    fileKey?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };

  'chat.message.received': AppEventMap['chat.message.sent'];

  'chat.guests.added': {
    chatId: string;
    guestIds: string[];
    addedBy: string;
    titleTrack: string;
    emailGuest: string[];
  }

  'chat.message.read': {
    chatId: string;
    userId: string;
    readAt: Date;
  };

  'chat.guests.removed': {
    chatId: string;
    guestIds: string[];
    removedBy: string;
  }

  //🎶 traack

  'track.request.created': {
    chatId: string;
    requesterId: string;
    authorIds: string[];
    trackTitle: string;
    licenseType: LicenseType;
  }

  'track.request.updated': {
    requestId: string;
    chatId: string;
    trackTitle: string;
    status: string;
    requesterId: string;
    requesterEmail: string;
    requesterName: string;
  }

  'track.request.price.set': {
    requestId: string;
    chatId: string;
    trackTitle: string;
    priceInCOP: number;
    requesterId: string;
  }

  'track.request.license.approved': {
    requestId: string;
    chatId: string;
    trackTitle: string;
    requesterId: string;
    ownerId: string;
  }

  'track.created': {
    trackId: string;
    audioKey: string;
    requestedByUserId?: string;
    trackTitle: string;
    authorIds: string[];
  }

  // 💳 PAGOS / SUSCRIPCIONES

  'payment.subscription.approved': {
    userId: string;
    planType: UserPlanType;
    plan: UserPlan;
    paymentId: string;
    paymentType: PaymentType;
    billingPeriod?: BillingPeriod;
    amount: number;
    isFirstPurchase: boolean;
    occurredAt: Date;
  }

  // ⚖️ EVIDENCIA LEGAL

  'legal-proof.generated': {
    legalProofId: string;
    entityType: string;
    entityId: string;
    sha256Hash: string;
    otsKey: string | null;
    status: string;
    occurredAt: Date;
  }

  'legal-proof.failed': {
    entityType: string;
    entityId: string;
    reason: string;
    occurredAt: Date;
  }

  // 🔐 OTP

  'otp.code.issued': {
    userId: string;
    code: string;
    purposeLabel: string;
    expiresAt: Date;
  }

  // 🖋️ SPLIT

  'split.created': {
    splitId: string;
    trackId: string;
    trackTitle: string;
    createdByUserId: string;
    createdByName: string;
    authors: {
      userId: string;
      name: string;
      email: string;
      percentage: number;
      role: string;
    }[];
  }

  'split.author.rejected': {
    splitId: string;
    trackId: string;
    trackTitle: string;
    authorUserId: string;
    authorName: string;
    reason: string;
    createdByUserId: string;
    createdByName: string;
    createdByEmail: string;
  }

  'split.completed': {
    splitId: string;
    trackId: string;
    trackTitle: string;
    createdByUserId: string;
    createdByName: string;
    createdByEmail: string;
  }

  // 💰 GESTIÓN DE COBROS (anticipos de licencia de primer uso)

  'license.collection.link.sent': {
    collectionId: string;
    requestedTrackId: string;
    channel: string;
    sentAt: Date;
  }

  'license.collection.send.exhausted': {
    collectionId: string;
    requestedTrackId: string;
    trackTitle: string;
    attempts: number;
    lastError: string;
  }

  'license.collection.overdue': {
    collectionId: string;
    requestedTrackId: string;
    trackTitle: string;
    dueDate: Date;
    licenseContractId?: string;
  }

  // 📜 CONTRATO DE LICENCIA DE PRIMER USO (generado en línea)

  'license.contract.terms.saved': {
    contractId: string;
    requestedTrackId: string;
    ownerId: string;
    trackTitle: string;
  }

  'license.contract.preview.generated': {
    contractId: string;
    requestedTrackId: string;
    trackTitle: string;
    signatories: { userId: string; name: string; email: string; roleLabel: string }[];
  }

  'license.contract.signatory.signed': {
    contractId: string;
    signatoryId: string;
    userId: string;
    userName: string;
    roleLabel: string;
    trackTitle: string;
    allSigned: boolean;
  }

  'license.contract.signatory.rejected': {
    contractId: string;
    signatoryId: string;
    userId: string;
    userName: string;
    reason: string;
    trackTitle: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
  }

  'license.contract.signed': {
    contractId: string;
    requestedTrackId: string;
    trackTitle: string;
    documentUrl: string;
    parties: { userId: string; name: string; email: string }[];
  }

  'license.contract.fully_paid': {
    licenseContractId: string;
    requestedTrackId: string;
  }

  'license.contract.expiration.pending_confirmation': {
    contractId: string;
    requestedTrackId: string;
    trackTitle: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
    requesterId: string;
    requesterEmail: string;
    requesterName: string;
  }

  'license.contract.fulfilled': {
    contractId: string;
    requestedTrackId: string;
    trackTitle: string;
    confirmedByUserId: string;
    otherPartyId: string;
    otherPartyEmail: string;
    otherPartyName: string;
    isrc: string;
  }

  // 📄 CERTIFICADO DE AUTORÍA

  'certificate.issued': {
    certificateId: string;
    trackId: string;
    trackTitle: string;
    registryNumber: string;
    recipients: { userId: string; name: string; email: string }[];
    incompleteRecipients: { userId: string; name: string }[];
    requestedByUserId?: string;
    requestedByUserEmail?: string;
  }

  'certificate.generation.failed': {
    trackId: string;
    trackTitle: string;
    requestedByUserId?: string;
    primaryUserEmail?: string;
    attempts: number;
    lastError: string;
  }

  // 💰 WALLET

  'license.collection.installment.paid': {
    collectionId: string;
    requestedTrackId: string;
    licenseContractId: string | null;
    installmentNumber: number;
    amount: number;
    paidAt: Date;
  }

  'wallet.withdrawal.requested': {
    withdrawalId: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    currency: string;
    requestedAt: Date;
  }

  'wallet.withdrawal.paid': {
    withdrawalId: string;
    userId: string;
    userEmail: string;
    userName: string;
    amount: number;
    paidAt: Date;
  }

  'wallet.withdrawal.rejected': {
    withdrawalId: string;
    userId: string;
    userEmail: string;
    userName: string;
    amount: number;
    reason: string;
    rejectedAt: Date;
  }

}
