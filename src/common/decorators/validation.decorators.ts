import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

/**
 * ENHANCED VALIDATION DECORATORS
 * 
 * Custom validation decorators for improved data validation and security
 */

/**
 * Validates that the string contains only safe characters (no XSS)
 */
export function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSafeString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Check for script tags, javascript:, data:, and other potentially harmful content
          const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /data:(?!image\/)/gi, // Allow data:image/ for base64 images
            /vbscript:/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /onmouseover\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /<form/gi
          ];
          
          return !dangerousPatterns.some(pattern => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially unsafe content`;
        },
      },
    });
  };
}

/**
 * Validates string length with custom min/max
 */
export function IsStringLength(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const [minLength, maxLength] = args.constraints;
          return value.length >= minLength && value.length <= maxLength;
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must be between ${min} and ${max} characters`;
        },
      },
    });
  };
}

/**
 * Validates that a numeric string is within range
 */
export function IsNumericStringInRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNumericStringInRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          if (!/^\d+$/.test(value)) return false;
          
          const numValue = parseInt(value, 10);
          const [minVal, maxVal] = args.constraints;
          return numValue >= minVal && numValue <= maxVal;
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must be a numeric string between ${min} and ${max}`;
        },
      },
    });
  };
}

/**
 * Validates YouTube URL format
 */
export function IsYouTubeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isYouTubeUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const youtubePatterns = [
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
            /^https?:\/\/youtu\.be\/[\w-]+/i
          ];
          
          return youtubePatterns.some(pattern => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid YouTube URL`;
        },
      },
    });
  };
}

/**
 * Validates meeting URL (Zoom, Teams, Meet, etc.)
 */
export function IsMeetingUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMeetingUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const meetingPatterns = [
            /^https?:\/\/([\w-]+\.)?zoom\.us\/.+/i,
            /^https?:\/\/teams\.microsoft\.com\/.+/i,
            /^https?:\/\/meet\.google\.com\/.+/i,
            /^https?:\/\/([\w-]+\.)?webex\.com\/.+/i,
            /^https?:\/\/([\w-]+\.)?gotomeeting\.com\/.+/i
          ];
          
          return meetingPatterns.some(pattern => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid meeting URL (Zoom, Teams, Meet, etc.)`;
        },
      },
    });
  };
}

/**
 * Validates future date/time
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          
          return date > new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}

/**
 * Validates that end time is after start time
 */
export function IsAfterStartTime(startTimeProperty: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAfterStartTime',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [startTimeProperty],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          
          if (!value || !relatedValue) return true; // Skip validation if either is missing
          
          const startDate = new Date(relatedValue);
          const endDate = new Date(value);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
          
          return endDate > startDate;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be after start time`;
        },
      },
    });
  };
}

/**
 * Validates file size in multipart uploads
 */
export function IsValidFileSize(maxSizeMB: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidFileSize',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxSizeMB],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional file
          
          const [maxSize] = args.constraints;
          const maxSizeBytes = maxSize * 1024 * 1024; // Convert MB to bytes
          
          if (Array.isArray(value)) {
            return value.every(file => file.size <= maxSizeBytes);
          }
          
          return value.size <= maxSizeBytes;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxSize] = args.constraints;
          return `File size cannot exceed ${maxSize}MB`;
        },
      },
    });
  };
}

/**
 * Validates allowed file types
 */
export function IsAllowedFileType(allowedTypes: string[], validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedFileType',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedTypes],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional file
          
          const [allowedMimeTypes] = args.constraints;
          
          if (Array.isArray(value)) {
            return value.every(file => allowedMimeTypes.includes(file.mimetype));
          }
          
          return allowedMimeTypes.includes(value.mimetype);
        },
        defaultMessage(args: ValidationArguments) {
          const [allowedTypes] = args.constraints;
          return `File type must be one of: ${allowedTypes.join(', ')}`;
        },
      },
    });
  };
}