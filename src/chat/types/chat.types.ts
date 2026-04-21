export enum ClientChatEvent {
    JOIN_CHAT = 'joinChat',
    SEND_MESSAGE = 'sendMessage',
}


export type ChatParticipantRole =
    | 'REQUESTER'
    | 'OWNER'
    | 'INVITED';