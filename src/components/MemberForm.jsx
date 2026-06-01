import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

const normalizeFamilyName = (value) => value?.trim().toLowerCase() || ''

const initialForm = {
  familyName: 'Gamai',
  fullName: '',
  nickname: '',
  gender: 'Perempuan',
  birthYear: '',
  birthplace: '',
  bio: '',
  photoUrl: '',
  parentIds: [],
  spouseIds: [],
  childIds: [],
}

const createFormState = (member, selectedFamilyName = 'Gamai', members = []) => ({
  familyName: member?.familyName || selectedFamilyName || 'Gamai',
  fullName: member?.fullName || '',
  nickname: member?.nickname || '',
  gender: member?.gender || 'Perempuan',
  birthYear: member?.birthYear || '',
  birthplace: member?.birthplace || '',
  bio: member?.bio || '',
  photoUrl: member?.photoUrl || '',
  parentIds: [...(member?.parentIds || [])],
  spouseIds: [...(member?.spouseIds || [])],
  childIds: member ? members.filter(m => m.parentIds?.includes(member.id)).map(m => m.id) : [],
})

const inputClassName =
  'w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'

export function MemberForm({
  members,
  onSubmit,
  loading,
  disabled,
  selectedFamilyName = 'Gamai',
  initialData = null,
  mode = 'create',
  onCancel,
}) {
  const [form, setForm] = useState(() => createFormState(initialData, selectedFamilyName, members))
  const isEditMode = mode === 'edit'

  const activeFamilyName = (form.familyName || selectedFamilyName || 'Gamai').trim()
  const availableMembers = members.filter(
    (member) =>
      member.id !== initialData?.id &&
      normalizeFamilyName(member.familyName) === normalizeFamilyName(activeFamilyName),
  )

  useEffect(() => {
    if (isEditMode) {
      setForm(createFormState(initialData, selectedFamilyName, members))
      return
    }

    setForm((current) => ({
      ...current,
      familyName: selectedFamilyName || 'Gamai',
      parentIds: [],
      spouseIds: [],
      childIds: [],
    }))
  }, [initialData, isEditMode, selectedFamilyName])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'familyName'
        ? {
            parentIds: [],
            spouseIds: [],
            childIds: [],
          }
        : {}),
    }))
  }

  const handleToggleArray = (key, id) => {
    setForm((current) => {
      const exists = current[key].includes(id)
      const next = exists
        ? current[key].filter((item) => item !== id)
        : [...current[key], id]

      return {
        ...current,
        [key]: key === 'parentIds' ? next.slice(0, 2) : next,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (disabled) {
      return
    }
    await onSubmit(form)
    if (isEditMode) {
      return
    }

    setForm({
      ...initialForm,
      familyName: activeFamilyName,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[28px] border border-stone-200/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(41,37,36,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-500">
            {isEditMode ? 'Edit Anggota' : 'Tambah Anggota'}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-950">
            {isEditMode ? 'Perbarui arsip keluarga' : 'Form silsilah keluarga'}
          </h3>
        </div>
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
          <Plus size={20} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
              Data Anggota
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Field label="Nama keluarga" required>
                <input
                  name="familyName"
                  value={form.familyName}
                  onChange={handleChange}
                  required
                  disabled={disabled}
                  className={inputClassName}
                  placeholder={`Contoh: ${selectedFamilyName || 'Gamai'}`}
                />
              </Field>
              <Field label="Nama lengkap" required>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  disabled={disabled}
                  className={inputClassName}
                  placeholder="Contoh: Budi, Ani, Siti (pisahkan dengan koma)"
                />
              </Field>
              <Field label="Nama panggilan">
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  disabled={disabled}
                  className={inputClassName}
                  placeholder="Contoh: Bunda Ima"
                />
              </Field>
              <Field label="Jenis kelamin">
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  disabled={disabled}
                  className={inputClassName}
                >
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </Field>
              <Field label="Tahun lahir">
                <input
                  name="birthYear"
                  type="number"
                  value={form.birthYear}
                  onChange={handleChange}
                  disabled={disabled}
                  className={inputClassName}
                  placeholder="Contoh: 1990"
                />
              </Field>
              <Field label="Tempat asal">
                <input
                  name="birthplace"
                  value={form.birthplace}
                  onChange={handleChange}
                  disabled={disabled}
                  className={inputClassName}
                  placeholder="Contoh: Jakarta"
                />
              </Field>
              <Field label="URL Foto">
                <input
                  name="photoUrl"
                  value={form.photoUrl}
                  onChange={handleChange}
                  disabled={disabled}
                  className={inputClassName}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Catatan / Bio">
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  disabled={disabled}
                  className={`${inputClassName} min-h-[100px] resize-y`}
                  placeholder="Catatan singkat tentang anggota ini..."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
              Hubungan Keluarga
            </p>

            <div className="space-y-4">
              <SelectionGroup
                title="Hubungkan orang tua"
                description="Pilih maksimal dua orang tua agar posisi node otomatis tersusun ke bawah."
                people={availableMembers}
                selectedIds={form.parentIds}
                onToggle={(id) => handleToggleArray('parentIds', id)}
                disabled={disabled}
              />

              <SelectionGroup
                title="Hubungkan pasangan"
                description="Relasi pasangan akan ditampilkan di bagan silsilah."
                people={availableMembers.filter(
                  (person) => !form.parentIds.includes(person.id),
                )}
                selectedIds={form.spouseIds}
                onToggle={(id) => handleToggleArray('spouseIds', id)}
                disabled={disabled}
              />

              <SelectionGroup
                title="Hubungkan anak"
                description="Pilih anggota yang merupakan anak dari anggota baru ini."
                people={availableMembers.filter(
                  (person) => !form.parentIds.includes(person.id),
                )}
                selectedIds={form.childIds}
                onToggle={(id) => handleToggleArray('childIds', id)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || disabled}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {disabled
          ? 'Hubungkan Firebase terlebih dahulu'
          : loading
            ? 'Menyimpan ke Firebase...'
            : isEditMode
              ? 'Simpan perubahan'
              : 'Simpan anggota keluarga'}
      </button>

      {isEditMode && onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Batal edit
        </button>
      ) : null}
    </form>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="space-y-2 text-sm text-stone-700">
      <span className="block font-medium">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

function SelectionGroup({
  title,
  description,
  people,
  selectedIds,
  onToggle,
  disabled,
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedPeople = selectedIds
    .map((id) => people.find((person) => person.id === id))
    .filter(Boolean)

  const filteredPeople = people.filter((person) => {
    if (selectedIds.includes(person.id)) {
      return false
    }

    return person.fullName.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div>
        <h4 className="font-medium text-stone-900">{title}</h4>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            if (!disabled && people.length) {
              setIsOpen((current) => !current)
            }
          }}
          disabled={disabled || !people.length}
          className={`${inputClassName} flex items-center justify-between text-left ${
            disabled || !people.length ? 'cursor-not-allowed' : ''
          }`}
        >
          <span className={selectedPeople.length ? 'text-stone-900' : 'text-stone-400'}>
            {selectedPeople.length
              ? `${selectedPeople.length} anggota dipilih`
              : people.length
                ? 'Klik untuk memilih anggota'
                : 'Belum ada anggota lain untuk dipilih'}
          </span>
          <span className="text-xs text-stone-500">{isOpen ? 'Tutup' : 'Pilih'}</span>
        </button>

        {selectedPeople.length ? (
          <div className="flex flex-wrap gap-2">
            {selectedPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggle(person.id)}
                disabled={disabled}
                className="rounded-full border border-amber-500 bg-amber-100 px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-200"
              >
                {person.fullName} ×
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">Belum ada yang dipilih.</p>
        )}

        {isOpen ? (
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={disabled || !people.length}
              className={inputClassName}
              placeholder="Cari nama anggota keluarga"
            />

            {filteredPeople.length ? (
              <div className="max-h-52 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2">
                <div className="space-y-1">
                  {filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        onToggle(person.id)
                        setQuery('')
                      }}
                      disabled={disabled}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50"
                    >
                      <span>{person.fullName}</span>
                      <span className="text-xs text-stone-400">
                        {person.nickname || 'Pilih'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : query.trim() ? (
              <p className="text-sm text-stone-500">Nama yang dicari belum ditemukan.</p>
            ) : (
              <p className="text-sm text-stone-500">Tidak ada anggota lain yang bisa dipilih.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
