/*
<ai_context>
Exports the types for the app.
</ai_context>
*/

export * from "./server-action-types";
export * from "./stripe-kv-types";
export * from "./supabase-types";

// ActionState type for all server action responses
export type ActionState<T> =
  | { isSuccess: true; message: string; data: T }
  | { isSuccess: false; message: string; data?: never };
