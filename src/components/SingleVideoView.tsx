import React, { useState } from 'react';
import {
  Clock,
  Eye,
  Calendar,
  Download,
  Film,
  Music,
  ExternalLink,
  Sparkles,
  Check,
  Radio,
} from 'lucide-react';
import { SingleVideoMetadata } from '../types/index';

interface SingleVideoViewProps {
  video: SingleVideoMetadata;
  onReset: () => void;
  onStartDownload: (formatId: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatViews(views?: number): string {
  if (views === undefined || views === null) return '';
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views.toLocaleString()} views`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr || dateStr.length !== 8) return '';
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

export const SingleVideoView: React.FC<SingleVideoViewProps> = ({
  video,
  onReset,
  onStartDownload,
}) => {
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');

  const videoFormats = video.formats.filter((f) => f.hasVideo);
  const audioFormats = video.formats.filter((f) => !f.hasVideo && f.hasAudio);

  const activeFormats = formatType === 'video' ? videoFormats : audioFormats;

  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    videoFormats[0]?.formatId || video.formats[0]?.formatId || ''
  );

  const handleFormatTypeChange = (type: 'video' | 'audio') => {
    setFormatType(type);
    if (type === 'video') {
      setSelectedFormatId(videoFormats[0]?.formatId || '');
    } else {
      setSelectedFormatId(audioFormats[0]?.formatId || 'audio-best');
    }
  };

  const currentSelectedFormat = video.formats.find((f) => f.formatId === selectedFormatId);

  return (
    <div className="w-full max-w-4xl space-y-6 text-left animate-fade-in">
      {/* 1. Main Video Result Card */}
      <div className="bg-[#0f172a]/95 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Top bar with content type badge & action */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>Single Video</span>
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline font-mono">
              ID: {video.id}
            </span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition focus:outline-none"
          >
            ← Analyze another URL
          </button>
        </div>

        {/* Video Information Row */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 items-start">
          {/* Thumbnail */}
          <div className="relative w-full sm:w-64 aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 shrink-0 shadow-lg group">
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Film className="w-10 h-10" />
              </div>
            )}
            <div className="absolute bottom-2.5 right-2.5 bg-black/85 px-2 py-0.5 rounded-md text-xs font-mono font-medium text-white flex items-center space-x-1 backdrop-blur-xs">
              <Clock className="w-3 h-3 text-slate-300" />
              <span>{video.durationText}</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {video.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-indigo-300 flex items-center space-x-1.5">
                <span>{video.channel}</span>
              </p>
            </div>

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-1">
              {video.viewCount !== undefined && (
                <span className="inline-flex items-center space-x-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatViews(video.viewCount)}</span>
                </span>
              )}

              {video.uploadDate && (
                <span className="inline-flex items-center space-x-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(video.uploadDate)}</span>
                </span>
              )}

              <span className="inline-flex items-center space-x-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Duration: {video.durationText}</span>
              </span>

              <a
                href={video.webpageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition ml-auto"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Format & Quality Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Format Card */}
        <div className="bg-[#0f172a]/95 border border-indigo-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            <span>Format Options</span>
          </h3>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleFormatTypeChange('video')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                formatType === 'video'
                  ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-xl ${
                    formatType === 'video' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Video (MP4)</p>
                  <p className="text-xs text-slate-400">High definition video with audio</p>
                </div>
              </div>
              {formatType === 'video' && <Check className="w-4 h-4 text-indigo-400" />}
            </button>

            <button
              type="button"
              onClick={() => handleFormatTypeChange('audio')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                formatType === 'audio'
                  ? 'bg-purple-600/20 border-purple-500/80 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-xl ${
                    formatType === 'audio' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Audio Only (MP3 / M4A)</p>
                  <p className="text-xs text-slate-400">High quality audio stream extraction</p>
                </div>
              </div>
              {formatType === 'audio' && <Check className="w-4 h-4 text-purple-400" />}
            </button>
          </div>
        </div>

        {/* Quality Card */}
        <div className="bg-[#0f172a]/95 border border-indigo-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Available Quality Streams</span>
          </h3>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {activeFormats.length > 0 ? (
              activeFormats.map((f) => {
                const isSelected = f.formatId === selectedFormatId;
                return (
                  <button
                    key={f.formatId}
                    type="button"
                    onClick={() => setSelectedFormatId(f.formatId)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600/25 to-purple-600/25 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? 'bg-indigo-400 ring-4 ring-indigo-500/20' : 'bg-slate-600'
                        }`}
                      ></div>
                      <div>
                        <p className="text-sm font-medium leading-none">{f.quality}</p>
                        <p className="text-[11px] text-slate-400 mt-1 uppercase font-mono">
                          {f.ext} {f.fps ? `• ${f.fps}fps` : ''}
                        </p>
                      </div>
                    </div>

                    {f.filesize && (
                      <span className="text-xs font-mono text-slate-400">
                        {formatBytes(f.filesize)}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-4">
                No specific formats found for this format type. Default stream will be used.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Primary Full-Width Download Action */}
      <div className="bg-[#0f172a]/95 border border-indigo-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onStartDownload(selectedFormatId)}
          disabled={!selectedFormatId}
          className="w-full inline-flex items-center justify-center space-x-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white cursor-pointer border border-indigo-500/40 text-base font-bold shadow-xl shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span>
            Download Video {currentSelectedFormat ? `• ${currentSelectedFormat.quality}` : ''}
          </span>
        </button>

        {/* Security & Engine Notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start space-x-3">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-indigo-300">Production Engine:</strong> Download is executed directly via native <code className="text-indigo-200 font-mono">yt-dlp</code> and <code className="text-indigo-200 font-mono">FFmpeg</code> in an isolated temporary working directory with automatic cleanup.
          </p>
        </div>
      </div>
    </div>
  );
};
