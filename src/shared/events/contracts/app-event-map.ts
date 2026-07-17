import { LicenseType } from "src/requested-tracks/entities/license-type.enum";
import { UserRole } from "src/users/entities/user-role.enum";
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

  // 💳 PAGOS / SUSCRIPCIONES

  'payment.subscription.approved': {
    userId: string;
    role: UserRole;
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

}
