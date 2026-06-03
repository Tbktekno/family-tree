import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
export function PersonNode({ data, selected }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="relative w-[118px] text-center">
      <Handle
        id="ancestor-target"
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-0 !bg-stone-400 !opacity-0"
      />
      <Handle
        id="descendant-source"
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-0 !bg-stone-400 !opacity-0"
      />
      <Handle
        id="spouse-left"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-stone-400 !opacity-0"
        style={{ top: 43 }}
      />
      <Handle
        id="spouse-right"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-stone-400 !opacity-0"
        style={{ top: 43 }}
      />

      <div
        onClick={(e) => {
          e.stopPropagation()
          setIsMenuOpen(!isMenuOpen)
        }}
        className={`mx-auto h-[86px] w-[86px] cursor-pointer overflow-hidden rounded-full border-[3px] bg-stone-200 shadow-[0_12px_28px_rgba(41,37,36,0.12)] transition duration-300 ${
          selected ? 'scale-105 shadow-[0_18px_32px_rgba(120,53,15,0.18)]' : ''
        }`}
        style={{ borderColor: data.generationColor }}
      >
        <img
          src={
            data.photoUrl ||
            `https://ui-avatars.com/api/?background=92400e&color=fff&name=${encodeURIComponent(data.fullName)}`
          }
          alt={data.fullName}
          className="h-full w-full object-cover"
        />
      </div>

      {isMenuOpen && (
        <div 
          className="absolute left-[105px] top-4 z-50 w-48 rounded-xl border border-stone-200 bg-white p-2 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (data.onSelect) data.onSelect(data.id)
              setIsMenuOpen(false)
            }}
            className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Lihat Detail
          </button>
          <button
            onClick={() => {
              if (data.onFocusDownward) data.onFocusDownward(data.id)
              setIsMenuOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Fokus ke Keturunan
          </button>
        </div>
      )}

      <div className="mt-2 space-y-1">
        <div
          className="mx-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-700"
          style={{ backgroundColor: `${data.generationColor}22` }}
        >
          {data.generationLabel}
        </div>
        <p className="line-clamp-2 font-serif text-[19px] font-bold leading-snug text-stone-900">
          {data.fullName}
        </p>
        {data.nickname ? (
          <p className="text-[11px] font-medium text-stone-500">{data.nickname}</p>
        ) : null}
      </div>
    </div>
  )
}
