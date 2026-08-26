import { useState } from 'react';
import type { AzureConfig, PRThread } from '../../types/azure';
import { replyToThread } from '../../api/pullRequests';
import { renderMarkdown } from '../../utils/markdown.tsx';
import { timeAgo } from '../../utils/time';

export function InlineThread({ thread, config, prId, onReplySubmitted }: {
  thread: PRThread;
  config: AzureConfig;
  prId: number;
  onReplySubmitted: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyToThread(config, prId, thread.id, replyText);
      setReplyText('');
      setShowReply(false);
      onReplySubmitted();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const statusColors: Record<number, string> = {
    1: 'border-blue-600 bg-blue-900/20',
    2: 'border-green-600 bg-green-900/20',
    3: 'border-yellow-600 bg-yellow-900/20',
    4: 'border-gray-600 bg-gray-800/40',
  };

  const visibleComments = thread.comments.filter((c) => c.commentType !== 2 && !c.isDeleted);

  return (
    <div className={`mx-2 my-2 border-l-4 rounded-r-lg p-3 space-y-2 shadow-lg ${statusColors[thread.status] ?? statusColors[1]}`}>
      {visibleComments.map((comment) => (
        <div key={comment.id}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-200">{comment.author.displayName}</span>
            <span className="text-[10px] text-gray-500">{timeAgo(comment.publishedDate)}</span>
          </div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap">{renderMarkdown(comment.content)}</div>
        </div>
      ))}
      {showReply ? (
        <div className="flex gap-2 mt-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribir respuesta..."
            className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={sending || !replyText.trim()}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '...' : 'Enviar'}
          </button>
          <button
            onClick={() => { setShowReply(false); setReplyText(''); }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Responder
        </button>
      )}
    </div>
  );
}
