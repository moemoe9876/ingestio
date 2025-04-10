/*
<ai_context>
Contains the general server action types.
</ai_context>
*/

/**
 * Standardized response type for server actions.
 * @template T The type of the data payload on success.
 */
export type ActionState<T = undefined> =
  | { isSuccess: true; message: string; data: T }
  | { isSuccess: false; message: string; error?: string; data?: never }
