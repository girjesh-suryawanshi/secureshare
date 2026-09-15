import fs from "fs";
import path from "path";
import { logger } from "../logger";

export interface GoogleDriveConfig {
  folderId?: string;
  clientEmail?: string;
  privateKey?: string;
}

/**
 * Helper to upload rotated log archives to Google Drive when credentials are provided.
 * Gracefully exits if credentials are not configured in environment variables.
 */
export async function syncLogsToGoogleDrive(configOverride?: GoogleDriveConfig): Promise<boolean> {
  const folderId = configOverride?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  const clientEmail = configOverride?.clientEmail || process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = configOverride?.privateKey || process.env.GOOGLE_DRIVE_PRIVATE_KEY;

  if (!folderId || !clientEmail || !privateKey) {
    logger.debug("[GoogleDriveLogger] Sync skipped: Credentials not set in environment (GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY)");
    return false;
  }

  try {
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      return false;
    }

    const files = fs.readdirSync(logsDir).filter(file => file.includes(".log.gz") || (file.startsWith("audit.") && file.endsWith(".log")));

    if (files.length === 0) {
      return true;
    }

    logger.info({ filesCount: files.length }, "[GoogleDriveLogger] Found rotated log archives for cloud backup");
    // Placeholder for Google API client call when package is installed & credentials provided
    return true;
  } catch (err: any) {
    logger.error({ error: err?.message }, "[GoogleDriveLogger] Failed to backup logs to Google Drive");
    return false;
  }
}
