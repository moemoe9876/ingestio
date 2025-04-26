import {
    customerDataKey,
    userToCustomerKey,
} from "@/types/stripe-kv-types"; // Adjust import path if needed
import { describe, expect, test } from "vitest";

describe("Stripe KV Store Key Generation", () => {
  test("userToCustomerKey should generate correct key format", () => {
    const userId = "user_123abc";
    const expectedKey = "stripe:user:user_123abc";
    expect(userToCustomerKey(userId)).toBe(expectedKey);
  });

  test("customerDataKey should generate correct key format", () => {
    const customerId = "cus_xyz789";
    const expectedKey = "stripe:customer:cus_xyz789";
    expect(customerDataKey(customerId)).toBe(expectedKey);
  });

  test("userToCustomerKey should handle empty userId", () => {
    const userId = "";
    const expectedKey = "stripe:user:";
    expect(userToCustomerKey(userId)).toBe(expectedKey);
  });

  test("customerDataKey should handle empty customerId", () => {
    const customerId = "";
    const expectedKey = "stripe:customer:";
    expect(customerDataKey(customerId)).toBe(expectedKey);
  });
}); 