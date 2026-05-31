import { Handle, Position } from '@xyflow/react'

export function ConnectorNode({ data }) {
  const size = data.size || 10

  return (
    <div
      className="rounded-full border border-white shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: data.color,
      }}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !opacity-0"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !opacity-0"
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !opacity-0"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !opacity-0"
      />
    </div>
  )
}
