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

  const visibleComments = thread.comments.filter((c) => c.commentType !== 2 && !c.isDeleted);

  return (
    <div className="ml-[44px] border-l-[3px] border-neutral-400 bg-neutral-50 px-3 py-2.5 my-1 space-y-2">
      {visibleComments.map((comment) => (
        <div key={comment.id}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold text-neutral-900">{comment.author.displayName}</span>
            <span className="text-[10px] text-neutral-500">{timeAgo(comment.publishedDate)}</span>
          </div>
          <div className="text-[12px] text-neutral-800 whitespace-pre-wrap">{renderMarkdown(comment.content)}</div>
        </div>
      ))}
      {showReply ? (
        <div className="flex gap-2 mt-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribir respuesta..."
            className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={sending || !replyText.trim()}
            className="px-3 py-1.5 text-[12px] font-semibold bg-neutral-900 text-neutral-100 hover:bg-neutral-800 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '...' : 'Enviar'}
          </button>
          <button
            onClick={() => { setShowReply(false); setReplyText(''); }}
            className="px-2 py-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          className="text-[11px] font-semibold text-accent-500 hover:text-accent-700 cursor-pointer"
        >
          Responder
        </button>
      )}
    </div>
  );
}
