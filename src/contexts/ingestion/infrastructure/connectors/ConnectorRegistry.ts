import { ConnectorNotFoundError } from "../../domain/errors";
import type { EpisodeConnector } from "./types";

export class ConnectorRegistry {
  private connectors = new Map<string, EpisodeConnector>();

  register(connector: EpisodeConnector): void {
    this.connectors.set(connector.sourceType, connector);
  }

  resolve(source: string): EpisodeConnector {
    const connector = this.connectors.get(source);
    if (!connector) {
      throw new ConnectorNotFoundError(source);
    }
    return connector;
  }

  has(source: string): boolean {
    return this.connectors.has(source);
  }
}
