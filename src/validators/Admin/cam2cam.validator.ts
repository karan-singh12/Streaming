import Joi from 'joi';

// Get All Cam2Cam Rooms Schema (with pagination and search)
export const getAllCam2CamRoomsSchema = Joi.object({
    pageNumber: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    searchItem: Joi.string().optional().allow('', null),
});

// Update Cam2Cam Pricing Schema
export const updateCam2CamPricingSchema = Joi.object({
    streamerId: Joi.number().integer().positive().required(),
    duration15Min: Joi.number().positive().min(0.01).precision(2).optional(),
    duration30Min: Joi.number().positive().min(0.01).precision(2).optional(),
    duration45Min: Joi.number().positive().min(0.01).precision(2).optional(),
    duration60Min: Joi.number().positive().min(0.01).precision(2).optional(),
});