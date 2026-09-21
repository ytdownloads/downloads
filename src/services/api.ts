import {
  HealthCheckResponse,
  MediaInfoResult,
  InfoApiResponse,
  JobStatus,
  DownloadJobData,
  CreateDownloadResponse,
  CreateBatchDownloadRequest,
  CreateBatchDownloadResponse,
  AddBatchItemsRequest,
  AddBatchItemsResponse,
  BatchJobData,
  ApiError,
} from '../types/index';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const API_BASE = RAW_API_URL
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL.replace(/\/+$/, '') : `${RAW_API_URL.replace(/\/+$/, '')}/api`)
  : '/api';


export class ApiServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiServiceError';
    this.code = code;
    this.details = details;
  }
}

export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE}/health`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }

  return response.json();
}

export async function analyzeUrl(url: string, signal?: AbortSignal): Promise<MediaInfoResult> {
  const response = await fetch(`${API_BASE}/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url }),
    signal,
  });

  let payload: InfoApiResponse;
  try {
    payload = await response.json();
  } catch {
    throw new ApiServiceError(
      'PARSE_ERROR',
      `Unexpected server response (HTTP ${response.status}). Please try again.`
    );
  }

  if (!response.ok || !payload.success || !payload.data) {
    const errCode = payload.error?.code || `HTTP_${response.status}`;
    const errMessage = payload.error?.message || 'Failed to analyze URL. Please check the link.';
    throw new ApiServiceError(errCode, errMessage, payload.error?.details);
  }

  return payload.data;
}

export async function createDownload(
  url: string,
  formatId: string
): Promise<{ jobId: string; status: JobStatus }> {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url, formatId, type: 'video' }),
  });

  let payload: CreateDownloadResponse;
  try {
    payload = await response.json();
  } catch {
    throw new ApiServiceError(
      'PARSE_ERROR',
      `Unexpected server response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !payload.success || !payload.data) {
    const errCode = payload.error?.code || `HTTP_${response.status}`;
    const errMessage = payload.error?.message || 'Failed to initiate download job.';
    throw new ApiServiceError(errCode, errMessage, payload.error?.details);
  }

  return payload.data;
}

export async function cancelDownload(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/download/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let message = 'Failed to cancel download.';
    try {
      const payload = await response.json();
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new ApiServiceError('CANCEL_FAILED', message);
  }
}

export function getDownloadFileUrl(jobId: string): string {
  return `${API_BASE}/download/${encodeURIComponent(jobId)}/file`;
}

export interface DownloadEventCallbacks {
  onStatus?: (data: DownloadJobData) => void;
  onProgress?: (data: DownloadJobData) => void;
  onCompleted?: (data: DownloadJobData) => void;
  onError?: (data: DownloadJobData) => void;
  onCancelled?: (data: DownloadJobData) => void;
}

export function subscribeDownloadEvents(
  jobId: string,
  callbacks: DownloadEventCallbacks
): () => void {
  const eventSource = new EventSource(`${API_BASE}/download/${encodeURIComponent(jobId)}/events`);

  const handleMessage = (event: Event, callback?: (data: DownloadJobData) => void) => {
    if (!callback) return;
    try {
      const messageEvent = event as MessageEvent;
      const data: DownloadJobData = JSON.parse(messageEvent.data);
      callback(data);
    } catch (err) {
      console.error('Failed to parse SSE event data', err);
    }
  };

  eventSource.addEventListener('status', (e) => handleMessage(e, callbacks.onStatus));
  eventSource.addEventListener('progress', (e) => handleMessage(e, callbacks.onProgress));
  eventSource.addEventListener('completed', (e) => handleMessage(e, callbacks.onCompleted));
  eventSource.addEventListener('error', (e) => handleMessage(e, callbacks.onError));
  eventSource.addEventListener('cancelled', (e) => handleMessage(e, callbacks.onCancelled));

  eventSource.onerror = () => {
    // If connection dropped or server closed
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function createBatchDownload(
  req: CreateBatchDownloadRequest
): Promise<{ batchJobId: string; totalItems: number; status: string }> {
  const response = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
  });

  let payload: CreateBatchDownloadResponse;
  try {
    payload = await response.json();
  } catch {
    throw new ApiServiceError(
      'PARSE_ERROR',
      `Unexpected server response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !payload.success || !payload.data) {
    const errCode = payload.error?.code || `HTTP_${response.status}`;
    const errMessage = payload.error?.message || 'Failed to initiate playlist batch download.';
    throw new ApiServiceError(errCode, errMessage, payload.error?.details);
  }

  return payload.data;
}

export async function getBatchStatus(batchJobId: string): Promise<BatchJobData> {
  const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchJobId)}/status`, {
    headers: {
      Accept: 'application/json',
    },
  });

  let payload: { success: boolean; data?: BatchJobData; error?: ApiError };
  try {
    payload = await response.json();
  } catch {
    throw new ApiServiceError('PARSE_ERROR', `Unexpected server response (HTTP ${response.status}).`);
  }

  if (!response.ok || !payload.success || !payload.data) {
    const errCode = payload.error?.code || `HTTP_${response.status}`;
    const errMessage = payload.error?.message || 'Failed to fetch batch download status.';
    throw new ApiServiceError(errCode, errMessage, payload.error?.details);
  }

  return payload.data;
}

export async function cancelBatchDownload(batchJobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchJobId)}/cancel`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let message = 'Failed to cancel batch download.';
    try {
      const payload = await response.json();
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new ApiServiceError('CANCEL_FAILED', message);
  }
}

export async function cancelBatchItem(
  batchJobId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/batch/${encodeURIComponent(batchJobId)}/items/${encodeURIComponent(itemId)}/cancel`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    let message = 'Failed to cancel item download.';
    try {
      const payload = await response.json();
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new ApiServiceError('CANCEL_FAILED', message);
  }
}

export async function retryBatchDownload(batchJobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchJobId)}/retry`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let message = 'Failed to retry batch download.';
    try {
      const payload = await response.json();
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new ApiServiceError('RETRY_FAILED', message);
  }
}

export async function addBatchItems(
  batchJobId: string,
  req: AddBatchItemsRequest
): Promise<BatchJobData> {
  const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchJobId)}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
  });

  let payload: AddBatchItemsResponse;
  try {
    payload = await response.json();
  } catch {
    throw new ApiServiceError(
      'PARSE_ERROR',
      `Unexpected server response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !payload.success || !payload.data) {
    const errCode = payload.error?.code || `HTTP_${response.status}`;
    const errMessage = payload.error?.message || 'Failed to add items to batch download.';
    throw new ApiServiceError(errCode, errMessage, payload.error?.details);
  }

  return payload.data.batch;
}

export function getBatchZipUrl(batchJobId: string): string {
  return `${API_BASE}/batch/${encodeURIComponent(batchJobId)}/zip`;
}

export function getBatchItemFileUrl(batchJobId: string, itemId: string): string {
  return `${API_BASE}/batch/${encodeURIComponent(batchJobId)}/items/${encodeURIComponent(itemId)}/file`;
}

export interface BatchEventCallbacks {
  onInit?: (data: BatchJobData) => void;
  onUpdate?: (data: BatchJobData) => void;
  onCancelled?: (data: BatchJobData) => void;
}

export function subscribeBatchEvents(
  batchJobId: string,
  callbacks: BatchEventCallbacks
): () => void {
  const eventSource = new EventSource(`${API_BASE}/batch/${encodeURIComponent(batchJobId)}/events`);

  const handleMessage = (event: Event, callback?: (data: BatchJobData) => void) => {
    if (!callback) return;
    try {
      const messageEvent = event as MessageEvent;
      const data: BatchJobData = JSON.parse(messageEvent.data);
      callback(data);
    } catch (err) {
      console.error('Failed to parse batch SSE event data', err);
    }
  };

  eventSource.addEventListener('init', (e) => handleMessage(e, callbacks.onInit));
  eventSource.addEventListener('batch_update', (e) => handleMessage(e, callbacks.onUpdate));
  eventSource.addEventListener('batch_cancelled', (e) => handleMessage(e, callbacks.onCancelled));

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

