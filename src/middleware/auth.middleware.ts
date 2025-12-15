import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AUTH, ERROR } from "../utils/responseMssg";
import { getDB } from "../config/db.config";
import asyncHandler from "express-async-handler";
import { AuthenticatedRequest, IAuthUser } from "../types/auth.types";
import * as apiRes from "../utils/apiResponse";

interface DecodedToken extends JwtPayload {
  _id: string;
  role?: string;
}

const verifyToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tokenKey: string | undefined;
    let userType: "admin" | "user" = "user";

    const url = req.baseUrl.split("/api/")[1]?.split("/")[0];

    if (url === "admin") {
      tokenKey = process.env.TOKEN_SECRET_KEY_1;
      userType = "admin";
    } else {
      tokenKey = process.env.TOKEN_SECRET_KEY_2;
    }

    if (!tokenKey) {
      apiRes.errorResponse(res, AUTH.tokenRequired);
      return;
    }

    const bearerHeader = req.headers.authorization;
    if (!bearerHeader || !bearerHeader.startsWith("Bearer ")) {
      apiRes.errorResponse(res, AUTH.tokenRequired);
      return;
    }

    const bearerToken = bearerHeader.split(" ")[1];
    if (!bearerToken) {
      apiRes.errorResponse(res, AUTH.tokenRequired);
      return;
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(bearerToken, tokenKey) as DecodedToken;
      if (!decoded._id) {
        apiRes.unauthorizedResponse(res, AUTH.invalidToken);
        return;
      }
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        apiRes.unauthorizedResponse(res, AUTH.tokenExpired);
        return;
      }

      apiRes.unauthorizedResponse(res, AUTH.invalidToken);
      return;
    }

    let user: IAuthUser | null = null;
    try {
      const db = getDB();

      if (userType === "admin") {
        const adminUser = await db('admins')
          .where('id', decoded._id)
          .where('status', '!=', 2) // Not deleted
          .select('id', 'name', 'email_address', 'role', 'status', 'created_at', 'updated_at')
          .first();
          
        if (adminUser) {
          user = {
            _id: adminUser.id,
            id: adminUser.id,
            name: adminUser.name,
            email_address: adminUser.email,
            role: adminUser.role || 'admin',
            status: adminUser.status,
            createdAt: adminUser.created_at,
            updatedAt: adminUser.updated_at
          };
        }
      } else {
        const regularUser = await db('users')
          .where('id', parseInt(decoded._id))
          .where('status', '!=', 2) // Not deleted
          .select('id', 'nickname', 'email_address', 'role', 'status', 'avatar', 'is_age_verified', 'created_at', 'updated_at')
          .first();
          
        if (regularUser) {
          user = {
            _id: regularUser.id.toString(),
            id: regularUser.id.toString(),
            nickname: regularUser.nickname,
            email_address: regularUser.email_address,
            role: regularUser.role || 'viewer',
            status: regularUser.status,
            avatar: regularUser.avatar,
            is_age_verified: regularUser.is_age_verified,
            createdAt: regularUser.created_at,
            updatedAt: regularUser.updated_at
          };
        }
      }

      if (!user) {
        apiRes.errorResponse(res, AUTH.userDeleted);
        return;
      }

      // Check if user is active
      // For admins: status 0 = inactive, 1 = active, 2 = deleted
      // For users: status 0 = inactive, 1 = active, 2 = deleted
      if (user.status === 0 || user.status === 2) {
        apiRes.errorResponse(res, AUTH.adminDeactived);
        return;
      }

      // Add user to request
      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      console.log("error", error);
      apiRes.errorResponse(res, ERROR.SomethingWrong);
      return;
    }
  } catch (error: any) {
    console.log("error", error);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
});

export default verifyToken;
