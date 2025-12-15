import Joi from 'joi';

// Streamer validation schemas
export const addStreamerSchema = Joi.object({
  email_address: Joi.string().email().required().lowercase(),
  password: Joi.string().min(8).required(),
  nickname: Joi.string().min(3).max(100).optional(),
  avatar: Joi.string().optional(),
  thumbnail: Joi.string().optional(),
  theme_description: Joi.string().optional().allow('', null),
  age: Joi.number().integer().min(18).max(100).optional(),
  height: Joi.string().max(20).optional(),
  weight: Joi.string().max(20).optional(),
  nationality: Joi.string().max(100).optional(),
  languages: Joi.string().max(200).optional(),
  attractive_body_part: Joi.string().max(100).optional(),
  specialties: Joi.string().optional().allow('', null),
  cam2cam_special_service: Joi.string().optional().allow('', null),
});

export const updateStreamerSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  email_address: Joi.string().email().optional().lowercase(),
  nickname: Joi.string().min(3).max(100).optional(),
  theme_description: Joi.string().optional().allow('', null),
  avatar: Joi.string().optional(),
  thumbnail: Joi.string().optional(),
  age: Joi.number().integer().min(18).max(100).optional(),
  height: Joi.string().max(20).optional(),
  weight: Joi.string().max(20).optional(),
  nationality: Joi.string().max(100).optional(),
  languages: Joi.string().max(200).optional(),
  attractive_body_part: Joi.string().max(100).optional(),
  specialties: Joi.string().optional().allow('', null),
  cam2cam_special_service: Joi.string().optional().allow('', null),
});

export const changeStreamerStatusSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  status: Joi.number().integer().valid(0, 1, 2).optional(),
});

export const deleteStreamerSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const getAllStreamersSchema = Joi.object({
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  pageNumber: Joi.number().integer().min(1).default(1),
  searchItem: Joi.string().optional().allow(''),
  status: Joi.array().items(Joi.number().integer().valid(0, 1, 2)).optional(),
});

export const getOneStreamerSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const updateStreamerProfileSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  age: Joi.number().integer().min(18).max(100).optional(),
  attractive_body_part: Joi.string().max(100).optional(),
  height: Joi.string().max(20).optional(),
  weight: Joi.string().max(20).optional(),
  nationality: Joi.string().max(100).optional(),
  languages: Joi.string().max(200).optional(),
  specialties: Joi.string().optional().allow('', null),
  cam2cam_special_service: Joi.string().optional().allow('', null),
  privatePrice: Joi.number().positive().optional(),
  exclusivePrivatePrice: Joi.number().positive().optional(),
  spyingPrice: Joi.number().positive().optional(),
  groupShowPrice: Joi.number().positive().optional(),
});

export const updateCommissionSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  privatePrice: Joi.number().positive().required(),
  exclusivePrivatePrice: Joi.number().positive().required(),
  spyingPrice: Joi.number().positive().required(),
  groupShowPrice: Joi.number().positive().required(),
  ticketShowPrice: Joi.number().positive().optional(),
});

