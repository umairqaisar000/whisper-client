export interface User {
    id: String
    userName: string
}

export interface Room {
    id: String
    roomName: string
}

export interface JwtPayload {
    user: User;
    sessionId: number;
    iat: number;
    exp: number;
  }