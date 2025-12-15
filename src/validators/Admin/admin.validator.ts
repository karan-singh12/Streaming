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

// Admin validation schemas
export const addAdminSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email_address: Joi.string().email().required().lowercase(),
  password: strongPassword.required(),
  role: Joi.string().valid('admin', 'super_admin').default('admin'),
});

export const loginAdminSchema = Joi.object({
  email_address: Joi.string().email().required().lowercase(),
  password: Joi.string().required(),
});

export const verifyOTPSchema = Joi.object({
  email_address: Joi.string().email().required().lowercase(),
  otp: Joi.string().length(6).required(),
});

export const forgotPasswordSchema = Joi.object({
  email_address: Joi.string().email().required().lowercase(),
});

export const resetPasswordSchema = Joi.object({
  email_address: Joi.string().email().optional().lowercase(),
  newPassword: strongPassword.required(),
  token: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: strongPassword.required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'New password and confirm password must match.',
  }),
});

export const editProfileSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  email_address: Joi.string().email().optional().lowercase(),
});

