export interface ScenarioReader {
  getLatestGraphVersion(): Promise<string>;
}
