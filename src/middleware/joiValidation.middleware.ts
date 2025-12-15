import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validationErrorResponse } from '../utils/apiResponse';
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      validationErrorResponse(
        res,
        'Validation failed',
        formattedErrors
      );
      return;
    }

    // Replace the original data with validated and sanitized data
    if (source === 'body') {
      req.body = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    next();
  };
};

