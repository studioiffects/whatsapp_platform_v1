import { IsString } from "class-validator";

export class TestProviderDto {
  @IsString()
  provider!: string;

  @IsString()
  model!: string;
}
