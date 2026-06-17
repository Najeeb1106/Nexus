import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">Draw Your Signature</h3>
        <p className="text-sm text-gray-500 mb-4">Use your mouse or finger to sign below.</p>
        <canvas ref={canvasRef} width={460} height={180}
          className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair w-full touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        <div className="flex justify-between mt-4">
          <button onClick={clear} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600">
            <Trash2 size={16} /> Clear
          </button>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
              Cancel
            </button>
            <button onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL('image/png'))}
              disabled={!hasSignature}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 disabled:opacity-40 text-white rounded-lg font-medium">
              <Check size={16} /> Sign Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
