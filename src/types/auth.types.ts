import { Request } from 'express';

export interface IAuthUser {
    _id?: string | number;
    id?: string | number;
    username?: string;
    nickname?: string;
    name?: string;
    email?: string;
    role?: string;
    isStreamer?: boolean;
    isModel?: boolean;
    isVerified?: boolean;
    status?: number;
    avatar?: string;
    avatar_url?: string; // Deprecated - use avatar instead
    is_age_verified?: boolean;
    email_verified?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
    user: IAuthUser;
}

// // Type guard to check if request is authenticated
// export function isAuthenticated(req: Request): req is AuthenticatedRequest {
//     return 'user' in req && req.user !== undefined;
// }

// // Type guard to check if user has specific role
// export function hasRole(user: IAuthUser, role: string): boolean {
//     return user.role === role;
// }

// // Type guard to check if user is a streamer
// export function isStreamer(user: IAuthUser): boolean {
//     return user.isStreamer === true;
// }

// // Type guard to check if user is a model
// export function isModel(user: IAuthUser): boolean {
//     return user.isModel === true;
// }

// // Type guard to check if user is verified
// export function isVerified(user: IAuthUser): boolean {
//     return user.isVerified === true;
// }

// // Type guard to check if user is active
// export function isActive(user: IAuthUser): boolean {
//     return user.status === 1;
// }
