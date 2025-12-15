// Type definitions for models (PostgreSQL/Knex.js)
export interface IUser {
    id?: number | string;
    isStreamer?: boolean;
    [key: string]: any;
}

export interface IRoom {
    id?: number;
    userId?: number;
    streamKey?: string;
    isLive?: boolean;
    status?: number; // 0 = inactive, 1 = active, 2 = deleted
    lastStreamedAt?: Date | null;
    [key: string]: any;
}
