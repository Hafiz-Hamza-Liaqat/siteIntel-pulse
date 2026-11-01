import { z } from "zod";

export const TenantPlanSchema = z.enum(["guest", "free", "starter", "pro", "enterprise"]);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const TenantSchema = z.object({
  id: z.string().max(128),
  name: z.string().max(255),
  slug: z.string().max(255),
  plan: TenantPlanSchema.default("pro"),
  maxConcurrentScans: z.number().int().positive().default(2),
  scansPerHourQuota: z.number().int().positive().default(20),
  createdAt: z.string().max(100),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const UserRoleSchema = z.enum(["owner", "admin", "specialist", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().max(128),
  tenantId: z.string().max(128),
  email: z.string().email().max(255),
  role: UserRoleSchema.default("specialist"),
  name: z.string().max(255),
  createdAt: z.string().max(100),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  id: z.string().max(128),
  tokenHash: z.string().max(255),
  userId: z.string().max(128),
  tenantId: z.string().max(128),
  expiresAt: z.string().max(100),
  createdAt: z.string().max(100),
});
export type Session = z.infer<typeof SessionSchema>;

export const ApiKeySchema = z.object({
  id: z.string().max(128),
  keyHash: z.string().max(255),
  tenantId: z.string().max(128),
  name: z.string().max(255),
  role: UserRoleSchema.default("specialist"),
  createdAt: z.string().max(100),
  lastUsedAt: z.string().max(100).optional(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const AuthContextSchema = z.object({
  user: UserSchema,
  tenant: TenantSchema,
});
export type AuthContext = z.infer<typeof AuthContextSchema>;

export const RemediationStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "ACCEPTED_RISK"]);
export type RemediationStatus = z.infer<typeof RemediationStatusSchema>;

export const RemediationUpdateSchema = z.object({
  taskId: z.string().max(128),
  status: RemediationStatusSchema,
  assignedTo: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
});
export type RemediationUpdate = z.infer<typeof RemediationUpdateSchema>;
