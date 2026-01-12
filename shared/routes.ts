import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertReviewSchema, userSchema, productSchema, orderSchema, reviewSchema } from './schema.js';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        201: z.object({ message: z.string(), userId: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ email: z.string(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: userSchema }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      },
    },
    updateUser: {
      method: 'PUT' as const,
      path: '/api/auth/user',
      input: userSchema.partial(),
      responses: {
        200: userSchema,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      input: z.object({ q: z.string().optional() }).optional(),
      responses: {
        200: z.array(productSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: productSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: productSchema,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: productSchema,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  reviews: {
    create: {
      method: 'POST' as const,
      path: '/api/reviews',
      input: insertReviewSchema,
      responses: {
        201: reviewSchema,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/reviews/:id',
      responses: {
        204: z.void(),
      },
    },
    list: { // Get reviews by product
        method: 'GET' as const,
        path: '/api/products/:id/reviews',
        responses: {
            200: z.array(reviewSchema)
        }
    }
  },
  orders: {
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: insertOrderSchema,
      responses: {
        201: orderSchema,
      },
    },
    list: { // User's orders
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.array(orderSchema),
      },
    },
    listAll: { // Admin all orders
      method: 'GET' as const,
      path: '/api/admin/orders',
      responses: {
        200: z.array(orderSchema),
      },
    },
    get: {
        method: 'GET' as const,
        path: '/api/orders/:id',
        responses: {
            200: orderSchema,
            404: errorSchemas.notFound
        }
    },
    cancel: {
      method: 'POST' as const,
      path: '/api/orders/:id/cancel',
      responses: {
        200: orderSchema,
      },
    },
    updateStatus: {
        method: 'PATCH' as const,
        path: '/api/admin/orders/:id/status',
        input: z.object({ status: z.enum(["Pending", "Accepted", "Out for Delivery", "Delivered", "Failed", "Cancelled"]) }),
        responses: {
            200: orderSchema
        }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
