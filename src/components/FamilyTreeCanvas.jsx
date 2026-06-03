import { useMemo } from 'react'
import {
  Background,
  Controls,
  ControlButton,
  ReactFlow,
} from '@xyflow/react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { ConnectorNode } from './ConnectorNode'
import { PersonNode } from './PersonNode'
import { buildGraph } from '../utils/graph'

const nodeTypes = {
  connector: ConnectorNode,
  person: PersonNode,
}

export function FamilyTreeCanvas({ members, selectedId, onSelect, onFocusDownward, isFocusMode, onResetFocus }) {
  const { nodes, edges } = useMemo(
    () => buildGraph(members, selectedId, onFocusDownward, onSelect),
    [members, selectedId, onFocusDownward, onSelect],
  )
  const graphKey = useMemo(
    () => members.map((member) => member.id).sort().join(':') || 'empty-family',
    [members],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative h-[720px] overflow-hidden rounded-[32px] border border-stone-200/80 bg-[linear-gradient(180deg,_rgba(255,253,250,0.98),_rgba(252,249,244,0.98))] shadow-[0_30px_90px_rgba(120,53,15,0.12)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-6 top-4 z-10 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        <span className="rounded-full bg-[#5fbfc922] px-3 py-1">Generasi 1</span>
        <span className="rounded-full bg-[#f2b84b22] px-3 py-1">Generasi 2</span>
        <span className="rounded-full bg-[#8fd26c22] px-3 py-1">Generasi 3</span>
        <span className="rounded-full bg-[#7b9af722] px-3 py-1">Generasi 4+</span>
      </div>
      <ReactFlow
        key={graphKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.45}
        maxZoom={1.3}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable
        colorMode="light"
        onNodeClick={(_, node) => {
          if (node.type === 'person') {
            onSelect(node.id)
          }
        }}
      >
        <Background color="#ece3d7" gap={34} size={1} />
        <Controls className="!rounded-2xl !border !border-stone-200/80 !bg-white/90 !shadow-lg">
          {isFocusMode && (
            <ControlButton 
              onClick={onResetFocus} 
              title="Reset Tampilan (Kembali ke Semula)"
              className="!text-amber-600 hover:!bg-amber-50"
            >
              <RotateCcw size={16} />
            </ControlButton>
          )}
        </Controls>
      </ReactFlow>
    </motion.div>
  )
}
