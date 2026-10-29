import { Workbook } from '../types/spreadsheet';

export const DEFAULT_GCS_BUCKET = 'ai-sheets-storage-c0e231c7';

export interface GCSFileItem {
  name: string;
  size: number;
  updated: string;
  contentType?: string;
}

/**
 * Save a workbook JSON to Google Cloud Storage
 */
export async function saveWorkbookToGCS(
  workbook: Workbook,
  bucketName = DEFAULT_GCS_BUCKET,
  accessToken?: string
): Promise<{ success: boolean; url: string; fileName: string }> {
  const sanitizedTitle = (workbook.title || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `workbooks/${sanitizedTitle}_${workbook.id}.json`;
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(workbook, null, 2),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCS Save Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    url: data.mediaLink || `https://storage.googleapis.com/${bucketName}/${fileName}`,
    fileName,
  };
}

/**
 * List all saved spreadsheet workbooks from Google Cloud Storage bucket
 */
export async function listWorkbooksFromGCS(
  bucketName = DEFAULT_GCS_BUCKET,
  accessToken?: string
): Promise<GCSFileItem[]> {
  const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=workbooks/`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(listUrl, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCS List Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((item: any) => ({
    name: item.name,
    size: parseInt(item.size, 10),
    updated: item.updated,
    contentType: item.contentType,
  }));
}

/**
 * Load a workbook JSON from Google Cloud Storage
 */
export async function loadWorkbookFromGCS(
  fileName: string,
  bucketName = DEFAULT_GCS_BUCKET,
  accessToken?: string
): Promise<Workbook> {
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(downloadUrl, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCS Load Failed (${response.status}): ${errorText}`);
  }

  const workbook: Workbook = await response.json();
  return workbook;
}

/**
 * Delete a workbook from Google Cloud Storage
 */
export async function deleteWorkbookFromGCS(
  fileName: string,
  bucketName = DEFAULT_GCS_BUCKET,
  accessToken?: string
): Promise<boolean> {
  const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCS Delete Failed (${response.status}): ${errorText}`);
  }

  return true;
}
