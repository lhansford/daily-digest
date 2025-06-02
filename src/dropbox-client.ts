import { Dropbox } from "dropbox";
import { readFile } from "fs/promises";

export interface DropboxConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class DropboxClient {
  private dropbox: Dropbox;

  constructor(config: DropboxConfig) {
    this.dropbox = new Dropbox({
      fetch: fetch,
      ...config,
    });
  }

  async uploadFile(localPath: string, dropboxPath: string): Promise<void> {
    try {
      const fileBuffer = await readFile(localPath);

      await this.dropbox.filesUpload({
        path: dropboxPath,
        contents: fileBuffer,
        mode: { ".tag": "overwrite" },
        autorename: true,
      });

      console.log(`✅ Successfully uploaded to Dropbox: ${dropboxPath}`);
    } catch (error) {
      console.error("Error uploading to Dropbox:", error);
      throw error;
    }
  }

  async createFolder(path: string): Promise<void> {
    try {
      await this.dropbox.filesCreateFolderV2({
        path: path,
        autorename: false,
      });
    } catch (error: any) {
      // Ignore error if folder already exists
      if (error.error?.error_summary?.includes("path/conflict/folder")) {
        return;
      }
      throw error;
    }
  }

  async uploadEpub(localEpubPath: string, filename?: string): Promise<string> {
    const dropboxFolder = "/Apps/Rakuten Kobo";
    const dropboxFilename =
      filename || `daily-digest-${new Date().toISOString().split("T")[0]}.epub`;
    const dropboxPath = `${dropboxFolder}/${dropboxFilename}`;

    // Ensure the folder exists
    await this.createFolder(dropboxFolder);

    // Upload the file
    await this.uploadFile(localEpubPath, dropboxPath);

    return dropboxPath;
  }
}
