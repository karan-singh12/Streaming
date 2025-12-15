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

// Streamer Login Schema
export const streamerLoginSchema = Joi.object({
    email_address: sharedEmail.required(),
    password: strongPassword.required(),
});

// Streamer Edit Profile Schema
export const streamerEditProfileSchema = Joi.object({
    nickname: Joi.string().min(3).max(100).optional(),
    email_address: sharedEmail.optional(),
    theme_description: Joi.string().optional().allow('', null),
});

// Streamer Change Password Schema
export const streamerChangePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().messages({
        'any.required': 'Old password is required.',
    }),
    newPassword: strongPassword.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'New password and confirm password must match.',
        'any.required': 'Confirm password is required.',
    }),
});