import fs from "fs";
import path from "path";

export interface StorageAdapter {
  saveImage(buffer: Buffer, filename: string, mimeType?: string): Promise<{ filePath: string; url: string }>;
  getImage(filename: string): Promise<Buffer | null>;
  deleteImage(filename: string): Promise<boolean>;
  getImageUrl(filename: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(customDir?: string) {
    const isVercel = Boolean(process.env.VERCEL);
    const defaultDir = isVercel
      ? path.join("/tmp", "saga_data", "images")
      : path.join(process.cwd(), "data", "images");
    this.baseDir = customDir || defaultDir;
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create images storage dir:", e);
    }
  }

  async saveImage(buffer: Buffer, filename: string): Promise<{ filePath: string; url: string }> {
    const fullPath = path.join(this.baseDir, filename);
    await fs.promises.writeFile(fullPath, buffer);
    const url = `/api/images/${encodeURIComponent(filename)}`;
    return {
      filePath: fullPath,
      url,
    };
  }

  async getImage(filename: string): Promise<Buffer | null> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.baseDir, safeFilename);
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  }

  async deleteImage(filename: string): Promise<boolean> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.baseDir, safeFilename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  getImageUrl(filename: string): string {
    const safeFilename = path.basename(filename);
    return `/api/images/${encodeURIComponent(safeFilename)}`;
  }
}

// Default storage adapter instance (can be swapped with S3 / Cloud Storage in the future)
export const storage: StorageAdapter = new LocalStorageAdapter();

export class LocalAudioStorage {
  private baseDir: string;

  constructor(customDir?: string) {
    const isVercel = Boolean(process.env.VERCEL);
    const defaultDir = isVercel
      ? path.join("/tmp", "saga_data", "audio")
      : path.join(process.cwd(), "data", "audio");
    this.baseDir = customDir || defaultDir;
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create audio storage dir:", e);
    }
  }

  async saveAudio(buffer: Buffer, filename: string): Promise<{ filePath: string; url: string }> {
    const fullPath = path.join(this.baseDir, filename);
    await fs.promises.writeFile(fullPath, buffer);
    const url = `/api/audio/${encodeURIComponent(filename)}`;
    return { filePath: fullPath, url };
  }

  async getAudio(filename: string): Promise<Buffer | null> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.baseDir, safeFilename);
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  }

  async deleteAudio(filename: string): Promise<boolean> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.baseDir, safeFilename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }
}

export const audioStorage = new LocalAudioStorage();
