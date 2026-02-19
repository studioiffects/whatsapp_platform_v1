import { SetMetadata } from "@nestjs/common";
import { MFA_REQUIRED_KEY } from "../constants";

export const MfaRequired = (required = true) =>
  SetMetadata(MFA_REQUIRED_KEY, required);
