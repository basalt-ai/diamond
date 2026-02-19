import type { UUID } from "@/shared/types";

export interface ContextProfileData {
  id: UUID;
  name: string;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateContextProfileInput = {
  name: string;
  attributes?: Record<string, unknown>;
};

export type UpdateContextProfileInput = {
  name?: string;
  attributes?: Record<string, unknown>;
};
