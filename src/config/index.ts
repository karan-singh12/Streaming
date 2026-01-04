import dotenv from "dotenv";
import path from "path";

// Load default .env first
dotenv.config();

// Load environment-specific .env file (overwrites .env values)
const env = process.env.NODE_ENV || "development";
const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath, override: true });

export const config = {
    env,
    isProduction: env === "production",
    isDevelopment: env === "development",

    api: {
        port: parseInt(process.env.API_PORT || "3003", 10),
        version: process.env.API_VERSION || "1.0.0",
        adminPrefix: process.env.ADMIN_PREFIX || "/admin",
        userPrefix: process.env.USER_PREFIX || "/user",
    },

    db: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        name: process.env.DB_NAME || "msc_live",
        user: process.env.DB_USER || "postgres",
        pass: process.env.DB_PASS || "",
        ssl: process.env.DB_SSL === "true",
        url: process.env.DB_URL,
        pool: {
            min: parseInt(process.env.DB_POOL_MIN || "2", 10),
            max: parseInt(process.env.DB_POOL_MAX || "10", 10),
        }
    },

    auth: {
        adminTokenExpire: process.env.ADMIN_TOKEN_EXPIRE || "10d",
        userTokenExpire: process.env.USER_TOKEN_EXPIRE_TIME || "10d",
        resetPasswordExpire: parseInt(process.env.RESET_PASSWORD_EXPIRE_TIME || "5", 10),
        otpExpireTime: parseInt(process.env.OTP_EXPIRE_TIME || "5", 10),
        streamerTokenExpire: process.env.STREAMER_TOKEN_EXPIRE_TIME || "10d",
        secrets: {
            admin: process.env.TOKEN_SECRET_KEY_1,
            user: process.env.TOKEN_SECRET_KEY_2,
            streamer: process.env.TOKEN_SECRET_KEY_3,
        }
    },

    urls: {
        adminResetPassword: process.env.ADMIN_RESET_PASSWORD_URL || "http://localhost:5173/reset-password/",
        userVerify: process.env.USER_VERIFY_URL || "http://localhost:3000/verify-email",
    },

    mail: {
        service: process.env.SERVICE,
        email: process.env.EMAIL,
        pass: process.env.PASS,
        host: process.env.HOST,
        port: parseInt(process.env.EMAIL_PORT || "587", 10),
    },

    templates: {
        forgotPasswordAdmin: process.env.FORGOT_PASSWORD_ADMIN || "Forgot-Password-Admin",
        userSendPassword: process.env.USER_SEND_PASSWORD || "Send-Password-User",
        userSendResponse: process.env.USER_SEND_RESPONSE || "User-Send-Password",
        forgotPasswordUser: process.env.FORGOT_PASSWORD_USER || "Forgot-Password-User",
        verifyAccountUser: process.env.VERIFY_ACCOUNT_USER || "Verify-Account-User",
    },

    social: {
        googleLogin: process.env.GOOGLE_SOCIAL_LOGIN || "Google",
    },

    cms: {
        privacyPolicy: process.env.PRIVACY_POLICY || "privacy-policy",
        terms: process.env.TERMS || "terms-conditions",
        aboutUs: process.env.ABOUT_US || "about-us",
        appWelcomeScreen: process.env.APP_WELCOME_SCREEN || "welcome-screen",
        communityGuidelines: process.env.COMMUNITY_GUIDELINES || "community-guidelines",
    },

    wowza: {
        baseUrl: process.env.WOWZA_BASE_URL || '',
        applicationName: process.env.WOWZA_APPLICATION_NAME || '',
        username: process.env.WOWZA_USERNAME || '',
        password: process.env.WOWZA_PASSWORD || '',
        signalingUrl: process.env.WOWZA_SIGNALING_URL || '',
        rtmpUrl: process.env.WOWZA_RTMP_URL || '',
        hlsBaseUrl: process.env.WOWZA_HLS_BASE_URL || '',
        corsOrigins: (process.env.WOWZA_CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
    }
};
