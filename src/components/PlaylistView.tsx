import React, { useState } from 'react';
import {
  ListMusic,
  CheckSquare,
  Square,
  Clock,
  Download,
  Loader2,
  Sparkles,
  Check,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { PlaylistMetadata } from '../types/index';
import { useAutoDownload } from '../services/autoDownload';

interface PlaylistViewProps {
  playlist: PlaylistMetadata;
  onReset: () => void;
  onStartBatch?: (
    items: Array<{
      id: string;
      url: string;
      title: string;
      durationSeconds?: number;
      thumbnail?: string;
    }>,
    formatId: string
  ) => void;
  isStartingBatch?: boolean;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  onReset,
  onStartBatch,
  isStartingBatch = false,
}) => {
  const [autoDownload, toggleAutoDownload] = useAutoDownload();
  // Selection state (initially select all)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(playlist.items.map((i) => i.id))
  );

  const [limitError, setLimitError] = useState<string | null>(() => {
    return playlist.items.length > 30
      ? 'Maximum 30 videos can be downloaded in one batch. Please select 30 or fewer videos.'
      : null;
  });

  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('best');

  const getFormatId = (): string => {
    if (formatType === 'audio') return 'audio-best';
    if (selectedQuality === '1080p') return 'video-1080p';
    if (selectedQuality === '720p') return 'video-720p';
    if (selectedQuality === '480p') return 'video-480p';
    return 'video-1080p';
  };

  const handleInitializeDownload = () => {
    if (!onStartBatch || selectedIds.size === 0 || isStartingBatch) return;

    if (selectedIds.size > 30) {
      setLimitError(
        'Maximum 30 videos can be downloaded in one batch. Please select 30 or fewer videos.'
      );
      return;
    }

    setLimitError(null);
    const selectedItems = playlist.items
      .filter((i) => selectedIds.has(i.id))
      .map((i) => ({
        id: i.id,
        url: i.webpageUrl,
        title: i.title,
        durationSeconds: i.duration,
        thumbnail: i.thumbnail,
      }));

    onStartBatch(selectedItems, getFormatId());
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size <= 30) {
        setLimitError(null);
      } else {
        setLimitError(
          'Maximum 30 videos can be downloaded in one batch. Please select 30 or fewer videos.'
        );
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(playlist.items.map((i) => i.id));
    setSelectedIds(all);
    if (all.size > 30) {
      setLimitError(
        'Maximum 30 videos can be downloaded in one batch. Please select 30 or fewer videos.'
      );
    } else {
      setLimitError(null);
    }
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
    setLimitError(null);
  };

  const allSelected =
    playlist.items.length > 0 && selectedIds.size === playlist.items.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="w-full max-w-6xl space-y-6 text-left animate-slide-up">
      {/* 1. Playlist Information Card */}
      <div className="bg-[#0f172a]/95 border border-purple-500/20 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <ListMusic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Playlist Detected</span>
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline font-mono">
              ID: {playlist.id}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Auto Download Toggle */}
            <button
              type="button"
              onClick={() => toggleAutoDownload()}
              aria-label={`Toggle auto download. Currently ${autoDownload ? 'ON' : 'OFF'}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 duration-150 cursor-pointer min-h-[36px] ${
                autoDownload
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoDownload ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>Auto Download: {autoDownload ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors focus:outline-none cursor-pointer py-1"
            >
              ← Analyze another URL
            </button>
          </div>
        </div>

        {/* Banner Details */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 items-start">
          {/* Thumbnail */}
          <div className="relative w-full sm:w-52 aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 shrink-0 shadow-lg">
            {playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <ListMusic className="w-12 h-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-xs font-semibold text-white">
                {playlist.totalItems} videos
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {playlist.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-purple-300 flex items-center space-x-1.5">
                <span>Channel: {playlist.channel}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-1">
              <span className="inline-flex items-center space-x-1 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-300 font-medium">
                <ListMusic className="w-3.5 h-3.5 text-purple-400" />
                <span>Total Videos: {playlist.totalItems}</span>
              </span>

              <span className="inline-flex items-center space-x-1 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-purple-300 font-medium">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span>Selected: {selectedIds.size} / {playlist.items.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid: Left Video List + Right Download Options Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main: Selectable Video List (8 cols) */}
        <div className="lg:col-span-8 bg-[#0f172a]/95 border border-purple-500/20 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl">
          {/* Table Controls Header */}
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={allSelected ? handleClearAll : handleSelectAll}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition active:scale-95 duration-150 focus:outline-none cursor-pointer"
              >
                {allSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Select All</span>
                  </>
                )}
              </button>

              {!noneSelected && !allSelected && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-purple-300">
              Selected: {selectedIds.size} of {playlist.items.length}
            </span>
          </div>

          {/* Video Items List */}
          <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto pr-1">
            {playlist.items.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={`${item.id}-${item.index}`}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center space-x-2 sm:space-x-3.5 py-3 px-2 sm:px-2.5 rounded-xl cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-purple-600/10 hover:bg-purple-600/15'
                      : 'opacity-60 hover:opacity-100 hover:bg-slate-800/30'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition border active:scale-90 duration-150 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-slate-600 bg-slate-800 text-transparent'
                    }`}
                    aria-label={`Select ${item.title}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  {/* Index */}
                  <span className="text-xs font-mono text-slate-500 w-5 sm:w-6 text-right shrink-0">
                    #{item.index}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-14 sm:w-20 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Title & Duration */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate leading-snug">
                      {item.title}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs font-mono text-slate-400 shrink-0 pl-1">
                    {item.durationText && item.durationText !== '0:00' && item.durationText !== '00:00' ? item.durationText : '--:--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right-Side: Download Options Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#0f172a]/95 border border-purple-500/20 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Download Options</span>
          </h3>

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormatType('video')}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer ${
                  formatType === 'video'
                    ? 'bg-purple-600/25 border-purple-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Video (MP4)
              </button>
              <button
                type="button"
                onClick={() => setFormatType('audio')}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer ${
                  formatType === 'audio'
                    ? 'bg-purple-600/25 border-purple-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Audio (MP3)
              </button>
            </div>
          </div>

          {/* Quality Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Quality</label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="best">Best Available (Recommended)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
              <option value="480p">480p SD</option>
            </select>
          </div>

          {/* Selection Counter Pill */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Items queued:</span>
            <span className="font-bold text-purple-400">
              {selectedIds.size} / {playlist.items.length}
            </span>
          </div>

          {/* 30-Video Limit Warning Banner */}
          {limitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Limit Exceeded</p>
                <p className="text-[11px] mt-0.5 text-rose-300 leading-relaxed">{limitError}</p>
              </div>
            </div>
          )}

          {/* Download Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleInitializeDownload}
              disabled={selectedIds.size === 0 || isStartingBatch || selectedIds.size > 30}
              className="w-full min-h-[48px] inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border border-purple-500/30 text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-[0.99] transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Initialize Download ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>

          {/* Batch Features Notice */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-purple-300">Sequential Batch Active:</strong> Selected videos download strictly one by one with live progress and FFmpeg verification. Once complete, a single ZIP archive is generated for instant download.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
