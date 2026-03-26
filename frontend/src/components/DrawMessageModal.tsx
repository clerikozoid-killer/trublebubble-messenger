import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Send, Trash2, X } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

const COLORS = ['#FF2B5E', '#FFE066', '#FFFFFF', '#7C3AED', '#22C55E'] as const;

export default function DrawMessageModal({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (blob: Blob) => void;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<(typeof COLORS)[number]>(COLORS[0]);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const clearCanvas = useMemo(
    () => () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clearCanvas]);

  if (!open) return null;

  const withCtx = (fn: (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) => void) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    fn(ctx, c);
  };

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * c.width) / rect.width;
    const y = ((e.clientY - rect.top) * c.height) / rect.height;
    return { x, y };
  };

  const handleExport = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((b) => {
      if (!b) return;
      onSend(b);
      onClose();
    }, 'image/png', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[190] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-background-medium border border-background-light shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-4 py-3 border-b border-background-light/70 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Palette className="w-4 h-4 text-text-secondary" />
            {t('draw.title')}
          </div>
          <button
            type="button"
            className="p-1.5 hover:bg-background-light rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl border border-background-light/70 bg-black/90 p-2">
            <canvas
              ref={canvasRef}
              width={480}
              height={300}
              className="w-full h-auto rounded-lg touch-none"
              onPointerDown={(e) => {
                const pt = toCanvasPoint(e);
                drawingRef.current = true;
                lastRef.current = pt;
                (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                withCtx((ctx) => {
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 6;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(pt.x, pt.y);
                });
                e.preventDefault();
              }}
              onPointerMove={(e) => {
                if (!drawingRef.current) return;
                const pt = toCanvasPoint(e);
                const last = lastRef.current;
                if (!last) return;
                lastRef.current = pt;
                withCtx((ctx) => {
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 6;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(last.x, last.y);
                  ctx.lineTo(pt.x, pt.y);
                  ctx.stroke();
                });
                e.preventDefault();
              }}
              onPointerUp={() => {
                drawingRef.current = false;
                lastRef.current = null;
              }}
              onPointerCancel={() => {
                drawingRef.current = false;
                lastRef.current = null;
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={[
                    'w-7 h-7 rounded-full border transition-colors',
                    c === color ? 'border-white ring-2 ring-white/30' : 'border-background-light',
                  ].join(' ')}
                  style={{ background: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-lg bg-background-light hover:bg-background-medium transition-colors text-text-secondary"
                onClick={() => clearCanvas()}
                aria-label={t('draw.clear')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95 transition-opacity flex items-center gap-2"
                onClick={handleExport}
              >
                <Send className="w-4 h-4" />
                {t('draw.send')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

