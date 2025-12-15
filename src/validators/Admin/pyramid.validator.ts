import Joi from "joi";

// Update Pyramid Room Schema
export const updatePyramidRoostreaminghema = Joi.object({
  roomId: Joi.number().integer().positive().required(),
  billingRatePerMinute: Joi.number()
    .positive()
    .min(0.01)
    .precision(2)
    .optional(),
  isPinned: Joi.boolean().optional(),
});
