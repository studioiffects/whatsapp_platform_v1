import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InMemoryStore } from "../store/in-memory.store";
import { CreateMcpConnectionDto } from "./dto/create-mcp-connection.dto";

@Injectable()
export class McpService {
  constructor(private readonly store: InMemoryStore) {}

  list() {
    return this.store.mcpConnections;
  }

  create(body: CreateMcpConnectionDto) {
    const connection = {
      id: randomUUID(),
      name: body.name,
      endpoint: body.endpoint,
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
    };
    this.store.mcpConnections.unshift(connection);
    return connection;
  }
}
