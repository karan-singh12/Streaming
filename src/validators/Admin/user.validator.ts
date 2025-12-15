import Joi from 'joi';

// User validation schemas
export const addUserSchema = Joi.object({
  email_address: Joi.string().email().required().lowercase(),
  nickname: Joi.string().min(3).max(100).optional(),
  password: Joi.string().min(8).optional(), // Optional because we generate it
  role: Joi.string().valid('user', 'viewer').default('user'),
  avatar: Joi.string().uri().optional(),
  membership: Joi.string().valid('trial', 'regular', 'premium', 'frozen').default('trial'),
  country_code: Joi.string().max(3).optional(),
  language: Joi.string().max(10).default('en'),
  is_age_verified: Joi.boolean().default(false),
  membership_expiration_date: Joi.date().optional(),
});

export const updateUserSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
  email_address: Joi.string().email().optional().lowercase(),
  nickname: Joi.string().min(3).max(100).optional(),
  status: Joi.number().integer().valid(0, 1, 2).optional(),
  avatar: Joi.string().optional(),
  country_code: Joi.string().max(3).optional(),
  language: Joi.string().max(10).optional(),
  membership: Joi.string().valid('trial', 'regular', 'premium', 'frozen').optional(),
  membership_expiration_date: Joi.date().optional(),
  credit_balance: Joi.number().optional(),
});

export const changeStatusSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
  status: Joi.number().integer().valid(0, 1, 2).required(),
});

export const deleteUserSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
});

export const getAllUsersSchema = Joi.object({
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  pageNumber: Joi.number().integer().min(1).default(1),
  searchItem: Joi.string().optional().allow(''),
  status: Joi.array().items(Joi.number().integer().valid(0, 1, 2)).optional(),
  type: Joi.string().valid('trial', 'regular', 'premium', 'frozen', '').optional(),
});

export const getOneUserSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
});

