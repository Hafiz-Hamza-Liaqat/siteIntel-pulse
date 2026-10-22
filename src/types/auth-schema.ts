import { z } from "zod";

export const TenantPlanSchema = z.enum(["free", "starter", "pro", "enterprise"]);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: TenantPlanSchema.default("pro"),
  maxConcurrentScans: z.number().int().positive().default(2),
  scansPerHourQuota: z.number().int().positive().default(20),
  createdAt: z.string(),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const UserRoleSchema = z.enum(["owner", "admin", "specialist", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  role: UserRoleSchema.default("specialist"),
  name: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  tokenHash: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export const ApiKeySchema = z.object({
  id: z.string(),
  keyHash: z.string(),
  tenantId: z.string(),
  name: z.string(),
  role: UserRoleSchema.default("specialist"),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
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
  taskId: z.string(),
  status: RemediationStatusSchema,
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});
export type RemediationUpdate = z.infer<typeof RemediationUpdateSchema>;
