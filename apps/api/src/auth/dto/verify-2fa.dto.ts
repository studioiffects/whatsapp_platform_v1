import { IsString, Length } from "class-validator";

export class Verify2FADto {
  @IsString()
  challengeToken!: string;

  @IsString()
  @Length(6, 10)
  code!: string;
}
