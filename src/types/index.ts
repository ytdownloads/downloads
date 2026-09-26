export interface HealthCheckResponse {
  success: boolean;
  status: string;
  ready?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface NormalizedFormat {
  formatId: string;
  ext: string;
  quality: string;
  height?: number;
  fps?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  filesize?: number;
}

export interface SingleVideoMetadata {
  type: 'video';
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  duration: number;
  durationText: string;
  webpageUrl: string;
  viewCount?: number;
  uploadDate?: string;
  isLive?: boolean;
  liveStatus?: string;
  formats: NormalizedFormat[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationText: string;
  webpageUrl: string;
  index: number;
}

export interface PlaylistMetadata {
  type: 'playlist';
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  totalItems: number;
  items: PlaylistItem[];
}

export type MediaInfoResult = SingleVideoMetadata | PlaylistMetadata;

export interface InfoApiResponse {
  success: boolean;
  data?: MediaInfoResult;
  error?: ApiError;
}

export type JobStatus =
  | 'created'
  | 'preparing'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadStage =
  | 'preparing'
  | 'downloading_video'
  | 'downloading_audio'
  | 'merging'
  | 'processing'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadProgress {
  status: JobStatus;
  stage?: DownloadStage;
  stageMessage?: string;
  isIndeterminate?: boolean;
  percentage: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  speedBytesPerSecond: number | null;
  etaSeconds: number | null;
}

export interface DownloadJobData {
  jobId: string;
  url: string;
  title?: string;
  formatId: string;
  status: JobStatus;
  progress: DownloadProgress;
  fileName?: string;
  fileSize?: number;
  error?: {
    code: string;
    message: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface CreateDownloadResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: JobStatus;
  };
  error?: ApiError;
}

export type BatchStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'cancelled'
  | 'failed';

export type PlaylistItemStatus =
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BatchItemData {
  id: string;
  url: string;
  title: string;
  durationSeconds?: number;
  thumbnail?: string;
  formatId: string;
  status: PlaylistItemStatus;
  stage?: DownloadStage;
  stageMessage?: string;
  isIndeterminate?: boolean;
  percentage: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speedBytesPerSecond: number | null;
  etaSeconds: number | null;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  error?: {
    code: string;
    message: string;
  };
}

export type BatchZipStatus = 'idle' | 'creating' | 'finalizing' | 'ready' | 'failed';

export interface BatchJobData {
  batchJobId: string;
  playlistTitle?: string;
  formatId: string;
  status: BatchStatus;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  cancelledItems: number;
  overallPercentage: number;
  items: BatchItemData[];
  zipStatus?: BatchZipStatus;
  zipStatusMessage?: string;
  zipFileName?: string;
  zipFileSize?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateBatchDownloadRequest {
  playlistTitle?: string;
  formatId: string;
  items: Array<{
    id: string;
    url: string;
    title: string;
    durationSeconds?: number;
    thumbnail?: string;
  }>;
}

export interface CreateBatchDownloadResponse {
  success: boolean;
  data?: {
    batchJobId: string;
    totalItems: number;
    status: BatchStatus;
  };
  error?: ApiError;
}

export interface AddBatchItemsRequest {
  formatId: string;
  items: Array<{
    id: string;
    url: string;
    title: string;
    durationSeconds?: number;
    thumbnail?: string;
  }>;
}

export interface AddBatchItemsResponse {
  success: boolean;
  data?: {
    batchJobId: string;
    addedCount: number;
    totalItems: number;
    status: BatchStatus;
    batch: BatchJobData;
  };
  error?: ApiError;
}
