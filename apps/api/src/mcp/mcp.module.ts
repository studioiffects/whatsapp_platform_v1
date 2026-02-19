import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";

@Module({
  imports: [StoreModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
