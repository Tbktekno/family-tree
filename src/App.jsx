import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { FamilyTreeCanvas } from './components/FamilyTreeCanvas'
import { MemberDetails } from './components/MemberDetails'
import { MemberForm } from './components/MemberForm'
import { useFamilyTree } from './hooks/useFamilyTree'

const normalizeFamilyName = (value) => value?.trim().toLowerCase() || ''

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const canAdd = path === '/tambah-anggota'
  const canEdit = path === '/edit-anggota'

  const {
    members,
    selectedId,
    selectedMember,
    setSelectedId,
    addMember,
    updateMember,
    deleteMember,
    deleteFamily,
    loading,
    hasFirebaseConfig,
    defaultFamilyName,
  } = useFamilyTree()

  const [selectedFamilyName, setSelectedFamilyName] = useState(defaultFamilyName)
  const [customFamilyNames, setCustomFamilyNames] = useState([])
  const [newFamilyName, setNewFamilyName] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [focusedAncestorId, setFocusedAncestorId] = useState(null)

  const familyNames = useMemo(() => {
    const names = Array.from(new Set([
      ...members.map((member) => member.familyName?.trim()).filter(Boolean),
      ...customFamilyNames.map((name) => name.trim()).filter(Boolean),
    ])).sort((left, right) => left.localeCompare(right))

    return names.length ? names : [defaultFamilyName]
  }, [customFamilyNames, defaultFamilyName, members])

  useEffect(() => {
    if (!familyNames.includes(selectedFamilyName)) {
      setSelectedFamilyName(familyNames[0] || defaultFamilyName)
    }
  }, [defaultFamilyName, familyNames, selectedFamilyName])

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          normalizeFamilyName(member.familyName) ===
          normalizeFamilyName(selectedFamilyName),
      ),
    [members, selectedFamilyName],
  )

  const selectedMemberInFamily =
    filteredMembers.find((member) => member.id === selectedId) ?? null

  const displayedMembers = useMemo(() => {
    if (!focusedAncestorId) return filteredMembers

    const descendantSet = new Set([focusedAncestorId])
    let added = true
    while (added) {
      added = false
      for (const member of filteredMembers) {
        if (descendantSet.has(member.id)) continue
        const isChild = member.parentIds?.some(pid => descendantSet.has(pid))
        if (isChild) {
          descendantSet.add(member.id)
          added = true
        }
      }
    }

    // Include spouses of descendants
    for (const member of filteredMembers) {
      if (descendantSet.has(member.id)) {
        member.spouseIds?.forEach(sid => descendantSet.add(sid))
      }
    }

    return filteredMembers.filter(m => descendantSet.has(m.id))
  }, [filteredMembers, focusedAncestorId])


  const handleSubmitMember = async (form) => {
    const familyName = form.familyName || selectedFamilyName || defaultFamilyName
    const names = form.fullName.split(',').map((name) => name.trim()).filter(Boolean)

    for (const name of names) {
      await addMember({ ...form, fullName: name }, familyName)
    }
  }

  const handleAddFamily = () => {
    const normalizedName = newFamilyName.trim()
    if (!normalizedName) {
      return
    }

    setCustomFamilyNames((current) =>
      current.includes(normalizedName) ? current : [...current, normalizedName],
    )
    setSelectedFamilyName(normalizedName)
    setNewFamilyName('')
  }

  return (
    <div className="min-h-screen bg-[#f6efe8] text-stone-900">
      <main className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <section className="mb-8 rounded-3xl bg-white p-8 text-center shadow-sm border border-stone-200 md:p-12">
          <h1 className="font-serif text-3xl text-stone-900 md:text-5xl">
            Pohon Silsilah Keluarga
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            Selamat datang! Di halaman ini, Bapak/Ibu bisa mencatat dan melihat hubungan antar anggota keluarga kita dari generasi ke generasi.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-stone-200/70 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm">
              <div>
                <h2 className="font-serif text-2xl text-stone-950">
                  Bagan Keluarga
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Pilih nama keluarga yang ingin dilihat, atau tambah keluarga baru. Klik pada nama di bagan untuk melihat detailnya.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-3 text-sm text-stone-700">
                  <span className="font-medium">Keluarga:</span>
                  <select
                    value={selectedFamilyName}
                    onChange={(event) => setSelectedFamilyName(event.target.value)}
                    className="min-w-[200px] rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  >
                    {familyNames.map((familyName) => (
                      <option key={familyName} value={familyName}>
                        {familyName}
                      </option>
                    ))}
                  </select>
                </label>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={loading}
                    className="flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Hapus keluarga ini"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={newFamilyName}
                    onChange={(event) => setNewFamilyName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddFamily()
                      }
                    }}
                    className="w-full min-w-[180px] rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    placeholder="Nama keluarga baru..."
                  />
                  <button
                    type="button"
                    onClick={handleAddFamily}
                    className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>
            <FamilyTreeCanvas
              members={displayedMembers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFocusDownward={setFocusedAncestorId}
              isFocusMode={!!focusedAncestorId}
              onResetFocus={() => setFocusedAncestorId(null)}
            />
          </div>

          <aside className="space-y-6">
            {!hasFirebaseConfig && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
                Sistem belum terhubung ke database. Mohon hubungi teknisi untuk mengatur penyimpanannya ya.
              </div>
            )}

            {hasFirebaseConfig && members.length === 0 && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950 shadow-sm">
                Belum ada data anggota keluarga yang dimasukkan. Silakan tambah anggota pertama di formulir bawah ini.
              </div>
            )}

            {hasFirebaseConfig && members.length > 0 && filteredMembers.length === 0 && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-700 shadow-sm">
                Belum ada anggota pada keluarga <strong>{selectedFamilyName}</strong>.
                Silakan tambah anggota baru.
              </div>
            )}

            <MemberDetails
              member={selectedMemberInFamily}
              members={filteredMembers}
              onDelete={deleteMember}
              onUpdate={updateMember}
              deleting={loading}
              updating={loading}
              canEdit={canEdit}
            />
            
          </aside>
        </section>
        
        {canAdd && (
          <div className="w-full mt-4">
            <MemberForm
                members={members}
                onSubmit={handleSubmitMember}
                loading={loading}
                disabled={!hasFirebaseConfig}
                selectedFamilyName={selectedFamilyName}
            />
          </div>
        )}
        
      </main>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-900">Hapus Keluarga?</h3>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              Apakah Bapak/Ibu yakin ingin menghapus seluruh anggota dari keluarga <strong className="text-stone-900">{selectedFamilyName}</strong>? 
              <br/><br/>
              Tindakan ini akan menghapus semua data dan tidak dapat dikembalikan.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-xl border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFamily(selectedFamilyName)
                  const nextFamily = familyNames.find(n => n !== selectedFamilyName) || defaultFamilyName
                  setSelectedFamilyName(nextFamily)
                  setIsDeleteModalOpen(false)
                }}
                disabled={loading}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-70"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



export default App
