import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, Clock, Trash2 } from 'lucide-react';
import { QAMessage } from '../types';

interface QAPanelProps {
  messages: QAMessage[];
  isAsking: boolean;
  onAsk: (question: string) => void;
  onClearMessages: () => void;
  onSeek: (time: number) => void;
  hasSubtitles: boolean;
}

export const QAPanel: React.FC<QAPanelProps> = ({
  messages,
  isAsking,
  onAsk,
  onClearMessages,
  onSeek,
  hasSubtitles,
}) => {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;
    onAsk(question.trim());
    setQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!hasSubtitles) {
    return (
      <div className="h-full bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center gap-4">
        <MessageCircle className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-sm text-center">请先加载字幕才能使用问答功能</p>
        <p className="text-slate-500 text-xs text-center">AI 需要字幕内容作为上下文来回答您的问题</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">视频问答</h3>
          <span className="text-xs text-slate-500">{messages.length} 条对话</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearMessages}
            className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            title="清空对话"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
            <MessageCircle size={32} className="mb-3 text-slate-600" />
            <p>在下方输入问题</p>
            <p className="text-xs text-slate-600 mt-1">AI 将根据当前视频内容回答</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {/* Question */}
              <div className="flex items-start gap-2">
                <div className="flex-1 bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-blue-400 font-medium">你的问题</span>
                    <button
                      onClick={() => onSeek(msg.timestamp)}
                      className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      title="跳转到提问时的视频位置"
                    >
                      <Clock size={10} />
                      {formatTime(msg.timestamp)}
                    </button>
                  </div>
                  <p className="text-sm text-slate-200">{msg.question}</p>
                </div>
              </div>

              {/* Answer */}
              <div className="flex items-start gap-2">
                <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                  <span className="text-xs text-emerald-400 font-medium mb-1 block">AI 回答</span>
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">正在思考...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {msg.answer}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送)"
            className="flex-1 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isAsking}
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isAsking ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
