import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),

  name: z.string().min(1, 'Name is required'),

  description: z.string().optional().default(''),

  unit: z.string().min(1).default('pcs'),

  price: z.coerce.number().min(0).default(0),

  minStock: z.coerce.number().int().min(0).default(0),

  currentStock: z.coerce.number().int().min(0).default(0),

  categoryId: z.string().optional().nullable(),

  supplierId: z.string().optional().nullable(),

  location: z.string().optional().default(''),

  rackNumber: z.string().optional().default(''),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),

  description: z.string().optional().default(''),

  skuPrefix: z
    .string()
    .trim()
    .min(1, 'SKU prefix is required')
    .max(30, 'SKU prefix is too long')
    .regex(/^[A-Za-z0-9_-]+-?$/, 'Use letters/numbers and optionally - or _'),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),

  contact: z.string().optional().default(''),

  phone: z.string().optional().default(''),

  email: z
    .string()
    .email('Invalid email')
    .or(z.literal(''))
    .optional(),

  address: z.string().optional().default(''),

  gstNumber: z.string().optional().default(''),
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),

  description: z.string().optional().default(''),

  status: z
    .enum(['active', 'completed', 'on-hold'])
    .default('active'),
});

/*
 * STOCK IN
 *
 * GST:
 * - gstPercentage = GST / SGST percentage
 * - cgstPercentage = CGST percentage
 * - gstType = CGST / SGST / IGST / UTGST
 *
 * When GST Type = CGST:
 * - gstPercentage acts as SGST Percentage
 * - cgstPercentage is entered manually
 * - SGST Amount + CGST Amount = Total GST
 *
 * For other GST types:
 * - gstPercentage is used as the single GST percentage
 *
 * Calculation will be handled in StockIn.jsx.
 */

export const stockInSchema = z.object({
  productId: z.string().min(1, 'Product is required'),

  quantity: z.coerce
    .number()
    .int()
    .positive('Quantity must be positive'),

  supplierId: z
    .string()
    .optional()
    .nullable(),

  location: z.string().optional().default(''),

  rackNumber: z.string().optional().default(''),

  unitCost: z
    .union([
      z.coerce.number().min(0),
      z.literal('').transform(() => undefined),
    ])
    .optional()
    .nullable(),

  gstPercentage: z.coerce
    .number()
    .min(0, 'GST cannot be negative')
    .max(100, 'GST cannot exceed 100%')
    .default(0),

  cgstPercentage: z.coerce
    .number()
    .min(0, 'CGST cannot be negative')
    .max(100, 'CGST cannot exceed 100%')
    .optional()
    .nullable(),

  gstType: z
    .enum([
      'CGST',
      'SGST',
      'IGST',
      'UTGST',
    ])
    .default('CGST'),

  reference: z
    .string()
    .optional()
    .default(''),

  date: z
    .string()
    .min(1, 'Date is required'),

  note: z
    .string()
    .optional()
    .default(''),
});

export const stockOutSchema = z.object({
  productId: z.string().min(1, 'Product is required'),

  quantity: z.coerce
    .number()
    .int()
    .positive('Quantity must be positive'),

  unitCost: z.coerce
    .number()
    .min(0, 'Price cannot be negative'),

  projectId: z.string().min(1, 'Project is required'),

  stockOutBy: z.string().min(1, 'Stock Out By is required'),

  date: z.string().min(1, 'Date is required'),

  note: z.string().optional().default(''),
});