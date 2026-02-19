import { apiFetch, apiFetchAuth } from "./base";
import {
  LoginResponse,
  MeResponse,
  Verify2FAResponse,
} from "../types/auth";

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verify2FARequest(
  challengeToken: string,
  code: string,
): Promise<Verify2FAResponse> {
  return apiFetch<Verify2FAResponse>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ challengeToken, code }),
  });
}

export async function meRequest(accessToken: string): Promise<MeResponse> {
  return apiFetchAuth<MeResponse>("/auth/me", accessToken, {
    method: "GET",
  });
}
