import { useEffect, useState } from 'react'
import { Baby, Cake, HeartHandshake, MapPin, Pencil, ScrollText, Trash2 } from 'lucide-react'
import { MemberForm } from './MemberForm'

export function MemberDetails({
  member,
  members,
  onDelete,
  onUpdate,
  deleting,
  updating,
  canEdit = false,
}) {
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setIsEditing(false)
  }, [member?.id])

  if (!member) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-6 text-sm text-stone-600">
        Klik salah satu nama di bagan untuk melihat detail dan profil lengkapnya.
      </div>
    )
  }

  const findNames = (ids = []) =>
    ids.map((id) => members.find((person) => person.id === id)?.fullName).filter(Boolean)

  const children = members.filter((person) => person.parentIds?.includes(member.id))

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Hapus anggota "${member.fullName}" dari silsilah keluarga?`,
    )

    if (confirmed) {
      onDelete(member.id)
    }
  }

  const handleUpdate = async (form) => {
    await onUpdate(member.id, form)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <MemberForm
        members={members}
        onSubmit={handleUpdate}
        loading={updating}
        disabled={false}
        selectedFamilyName={member.familyName}
        initialData={member}
        mode="edit"
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  const getLineageString = (startMember) => {
    let current = startMember
    const lineage = [current.fullName]
    const visited = new Set([current.id])

    while (current && current.parentIds?.length > 0) {
      const parents = current.parentIds
        .map((pid) => members.find((m) => m.id === pid))
        .filter(Boolean)
      
      if (parents.length === 0) break

      const nextParent = parents.find((p) => p.gender === 'Laki-laki') || parents[0]
      if (visited.has(nextParent.id)) break
      visited.add(nextParent.id)

      const isFemale = current.gender?.toLowerCase() === 'perempuan'
      const connector = isFemale ? 'binti' : 'bin'
      
      lineage.push(`${connector} ${nextParent.fullName}`)
      current = nextParent
    }

    return lineage.join(' ')
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-stone-200/70 bg-white/85 shadow-[0_20px_60px_rgba(41,37,36,0.12)]">
      <div className="relative h-44 overflow-hidden">
        <img
          src={
            member.photoUrl ||
            `https://ui-avatars.com/api/?background=92400e&color=fff&name=${encodeURIComponent(member.fullName)}`
          }
          alt={member.fullName}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200">
            Arsip Anggota
          </p>
          <h3 className="font-serif text-2xl font-semibold">{member.fullName}</h3>
          <p className="text-sm text-stone-200">{member.nickname || member.gender}</p>
        </div>
      </div>

      <div className="space-y-4 p-5 text-sm text-stone-700">
        {canEdit && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={updating || deleting}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={16} />
              Edit anggota
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || updating}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting ? 'Menghapus...' : 'Hapus anggota'}
            </button>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <InfoRow icon={Cake} label="Tahun lahir" value={member.birthYear || '-'} />
          <InfoRow icon={MapPin} label="Tempat asal" value={member.birthplace || '-'} />
          <InfoRow
            icon={HeartHandshake}
            label="Pasangan"
            value={findNames(member.spouseIds).join(', ') || '-'}
          />
          <InfoRow
            icon={Baby}
            label="Anak terhubung"
            value={children.map((child) => child.fullName).join(', ') || '-'}
          />
        </div>

        <InfoRow
          icon={ScrollText}
          label="Orang tua"
          value={findNames(member.parentIds).join(', ') || '-'}
        />

        <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            <ScrollText size={14} className="text-amber-700" />
            <span>Jalur Nasab / Silsilah</span>
          </div>
          <p className="text-sm leading-6 text-amber-900 font-serif italic">
            {getLineageString(member)}
          </p>
        </div>

        <div className="rounded-2xl bg-stone-50 p-4 leading-6 text-stone-600">
          {member.bio || 'Belum ada catatan keluarga untuk anggota ini.'}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        <Icon size={14} className="text-amber-700" />
        <span>{label}</span>
      </div>
      <p className="text-sm leading-6 text-stone-700">{value}</p>
    </div>
  )
}
