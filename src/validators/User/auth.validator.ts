import Joi from 'joi';

// Custom password validation: max 15 chars, no special characters
// Prohibited special characters: !@#￥%……&&（）？》《<>?,./，。/："；"*
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,15}$/;

const strongPassword = Joi.string()
    .pattern(PASSWORD_COMPLEXITY_REGEX)
    .messages({
        'string.pattern.base':
            'The password cannot exceed 15 characters and does not support the following special characters: !@#￥%……&&（）？》《<>?,./，。/："；"*',
    });

const sharedEmail = Joi.string().email().lowercase();

// User Signup Schema
export const userSignupSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
    password: strongPassword.required(),
    nickname: Joi.string().min(3).max(100).optional(),
    role: Joi.string().valid('user', 'viewer').optional(),
    membership_type: Joi.string().valid('trial', 'regular', 'premium', 'frozen').optional(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Login Schema
export const userLoginSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
    password: strongPassword.required(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Edit Profile Schema
export const userEditProfileSchema = Joi.object({
    nickname: Joi.string().min(3).max(100).optional(),
    email_address: sharedEmail.optional(),
    language: Joi.string().max(10).optional(),
    // Note: avatar is handled as file upload, not in body validation
});

// User Forgot Password Schema
export const userForgotPasswordSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Reset Password Schema
export const userResetPasswordSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
    otp: Joi.string().required().messages({
        'any.required': 'OTP is required.',
    }),
    newPassword: strongPassword.required(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Change Password Schema
export const userChangePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().messages({
        'any.required': 'Old password is required.',
    }),
    newPassword: strongPassword.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'New password and confirm password must match.',
        'any.required': 'Confirm password is required.',
    }),
});

// User Verify Email Schema
export const userVerifyEmailSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
    otp: Joi.string().required().messages({
        'any.required': 'OTP is required.',
    }),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Resend OTP Schema
export const userResendOtpSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });

// User Resend Verify Mail Schema
export const userResendVerifyMailSchema = Joi.object({
    email_address: sharedEmail.optional(),
    email: sharedEmail.optional(),
})
    .or('email_address', 'email')
    .messages({
        'object.missing': 'Email address is required.',
    });
