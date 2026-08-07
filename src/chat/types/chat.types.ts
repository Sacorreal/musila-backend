export enum ClientChatEvent {
    JOIN_CHAT = 'joinChat',
    SEND_MESSAGE = 'sendMessage',
}


export type ChatParticipantRole =
    | 'REQUESTER'
    | 'OWNER'
    | 'INVITED'
    | 'PARTICIPANT';


export enum ChatType {
    REQUEST = 'REQUEST',
    DIRECT = 'DIRECT',
}


export enum MessageType {
    TEXT = 'TEXT',
    FILE = 'FILE',
    IMAGE = 'IMAGE',
}


export interface ConversationParty {
    id: string;
    name: string;
    lastName: string;
    avatarUrl?: string | null;
}

export interface ConversationItem {
    chatId: string;
    kind: 'REQUEST' | 'DIRECT';
    otherParty: ConversationParty | null;
    track: { title: string; coverUrl?: string | null } | null;
    status: string | null;
    unreadCount: number;
    lastMessageAt: Date | null;
}