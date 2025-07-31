import { randomUUID } from "crypto";

// This application is serverless - no persistent storage needed
// All file transfers happen directly between peers via WebRTC
// The storage interface is minimal and only used for health checks

export interface IStorage {
  // Placeholder for any minimal server state if needed
  getConnectionCount(): Promise<number>;
}

export class MemStorage implements IStorage {
  private connectionCount: number = 0;

  constructor() {
    // No persistent storage needed for P2P file transfers
  }

  async getConnectionCount(): Promise<number> {
    return this.connectionCount;
  }

  setConnectionCount(count: number) {
    this.connectionCount = count;
  }
}

export const storage = new MemStorage();
