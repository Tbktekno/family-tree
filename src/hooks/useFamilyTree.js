import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../lib/firebase'

const DEFAULT_FAMILY_NAME = 'Gamai'

const normalizeMember = (member) => ({
  ...member,
  familyName: (member.familyName || DEFAULT_FAMILY_NAME).trim() || DEFAULT_FAMILY_NAME,
  parentIds: member.parentIds || [],
  spouseIds: member.spouseIds || [],
})

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const uniqueIds = (ids = []) => Array.from(new Set(ids.filter(Boolean)))

export function useFamilyTree() {
  const [members, setMembers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasFirebaseConfig || !db) {
      setMembers([])
      setSelectedId(null)
      return undefined
    }

    const familyQuery = query(collection(db, 'familyMembers'), orderBy('fullName'))

    return onSnapshot(familyQuery, (snapshot) => {
      const docsNeedingFamilyName = []
      const docs = snapshot.docs.map((item) => ({
          snapshotId: item.id,
          ...normalizeMember({
            id: item.id,
            ...item.data(),
          }),
          rawFamilyName: item.data().familyName,
        }))

      docs.forEach((member) => {
        if (!member.rawFamilyName?.trim()) {
          docsNeedingFamilyName.push(member.snapshotId)
        }
      })

      if (docsNeedingFamilyName.length) {
        Promise.all(
          docsNeedingFamilyName.map((memberId) =>
            updateDoc(doc(db, 'familyMembers', memberId), {
              familyName: DEFAULT_FAMILY_NAME,
            }),
          ),
        ).catch((error) => {
          console.error('Gagal memperbarui familyName default:', error)
        })
      }

      setMembers(
        docs.map(({ snapshotId, rawFamilyName, ...member }) => member),
      )
      setSelectedId((current) =>
        docs.some((member) => member.id === current) ? current : (docs[0]?.id ?? null),
      )
    })
  }, [])

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedId) ?? null,
    [members, selectedId],
  )

  const addMember = async (form, familyName = DEFAULT_FAMILY_NAME) => {
    setLoading(true)

    const payload = normalizeMember({
      id: `${slugify(form.fullName)}-${Date.now().toString().slice(-5)}`,
      familyName: familyName.trim() || DEFAULT_FAMILY_NAME,
      fullName: form.fullName.trim(),
      nickname: form.nickname.trim(),
      gender: form.gender,
      birthYear: '',
      deathYear: '',
      birthplace: '',
      photoUrl: '',
      bio: '',
      parentIds: form.parentIds,
      spouseIds: form.spouseIds,
      childIds: form.childIds,
      createdAt: new Date().toISOString(),
    })

    try {
      if (hasFirebaseConfig && db) {
        const { childIds, ...memberDocument } = payload

        await setDoc(doc(db, 'familyMembers', payload.id), {
          ...memberDocument,
          createdAt: serverTimestamp(),
        })

        await Promise.all(
          payload.spouseIds.map(async (spouseId) => {
            const spouse = members.find((member) => member.id === spouseId)
            if (!spouse) {
              return
            }

            const spouseRef = doc(db, 'familyMembers', spouseId)
            const spouseIds = Array.from(
              new Set([...(spouse.spouseIds || []), payload.id]),
            )
            await updateDoc(spouseRef, { spouseIds })
          }),
        )

        await Promise.all(
          childIds.map(async (childId) => {
            const child = members.find((member) => member.id === childId)
            if (!child) {
              return
            }

            const childRef = doc(db, 'familyMembers', childId)
            const parentIds = Array.from(
              new Set([...(child.parentIds || []), payload.id]),
            ).slice(0, 2)
            await updateDoc(childRef, { parentIds })
          }),
        )

        setSelectedId(payload.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateMember = async (memberId, form) => {
    if (!hasFirebaseConfig || !db || !memberId) {
      return
    }

    const currentMember = members.find((member) => member.id === memberId)
    if (!currentMember) {
      return
    }

    setLoading(true)

    const nextSpouseIds = uniqueIds(form.spouseIds)
    const prevSpouseIds = uniqueIds(currentMember.spouseIds)
    const removedSpouseIds = prevSpouseIds.filter((id) => !nextSpouseIds.includes(id))
    const addedSpouseIds = nextSpouseIds.filter((id) => !prevSpouseIds.includes(id))

    const prevChildIds = members
      .filter((m) => m.parentIds?.includes(memberId))
      .map((m) => m.id)
    const nextChildIds = uniqueIds(form.childIds)
    const removedChildIds = prevChildIds.filter((id) => !nextChildIds.includes(id))
    const addedChildIds = nextChildIds.filter((id) => !prevChildIds.includes(id))

    try {
      await updateDoc(doc(db, 'familyMembers', memberId), {
        familyName: (form.familyName || currentMember.familyName || DEFAULT_FAMILY_NAME).trim(),
        fullName: form.fullName.trim(),
        nickname: form.nickname.trim(),
        gender: form.gender,
        birthYear: form.birthYear || '',
        birthplace: form.birthplace || '',
        bio: form.bio || '',
        photoUrl: form.photoUrl || '',
        parentIds: uniqueIds(form.parentIds).slice(0, 2),
        spouseIds: nextSpouseIds,
      })

      await Promise.all(
        removedSpouseIds.map(async (spouseId) => {
          const spouse = members.find((member) => member.id === spouseId)
          if (!spouse) {
            return
          }

          await updateDoc(doc(db, 'familyMembers', spouseId), {
            spouseIds: uniqueIds((spouse.spouseIds || []).filter((id) => id !== memberId)),
          })
        }),
      )

      await Promise.all(
        addedSpouseIds.map(async (spouseId) => {
          const spouse = members.find((member) => member.id === spouseId)
          if (!spouse) {
            return
          }

          await updateDoc(doc(db, 'familyMembers', spouseId), {
            spouseIds: uniqueIds([...(spouse.spouseIds || []), memberId]),
          })
        }),
      )

      await Promise.all(
        removedChildIds.map(async (childId) => {
          const child = members.find((member) => member.id === childId)
          if (!child) return
          await updateDoc(doc(db, 'familyMembers', childId), {
            parentIds: uniqueIds((child.parentIds || []).filter((id) => id !== memberId)),
          })
        }),
      )

      await Promise.all(
        addedChildIds.map(async (childId) => {
          const child = members.find((member) => member.id === childId)
          if (!child) return
          await updateDoc(doc(db, 'familyMembers', childId), {
            parentIds: uniqueIds([...(child.parentIds || []), memberId]).slice(0, 2),
          })
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  const deleteMember = async (memberId) => {
    if (!hasFirebaseConfig || !db || !memberId) {
      return
    }

    const memberToDelete = members.find((member) => member.id === memberId)
    if (!memberToDelete) {
      return
    }

    setLoading(true)

    try {
      const relatedMembers = members.filter(
        (member) =>
          member.id !== memberId &&
          (member.spouseIds?.includes(memberId) || member.parentIds?.includes(memberId)),
      )

      await Promise.all(
        relatedMembers.map(async (member) => {
          const memberRef = doc(db, 'familyMembers', member.id)
          const nextSpouseIds = (member.spouseIds || []).filter((id) => id !== memberId)
          const nextParentIds = (member.parentIds || []).filter((id) => id !== memberId)

          await updateDoc(memberRef, {
            spouseIds: nextSpouseIds,
            parentIds: nextParentIds,
          })
        }),
      )

      await deleteDoc(doc(db, 'familyMembers', memberId))

      setSelectedId((current) => (current === memberId ? null : current))
    } finally {
      setLoading(false)
    }
  }

  const deleteAllMembers = async () => {
    if (!hasFirebaseConfig || !db || !members.length) {
      return
    }

    setLoading(true)

    try {
      await Promise.all(
        members.map((member) => deleteDoc(doc(db, 'familyMembers', member.id))),
      )

      setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }

  const deleteFamily = async (familyName) => {
    if (!hasFirebaseConfig || !db || !familyName) {
      return
    }

    setLoading(true)

    try {
      const familyMembers = members.filter(
        (member) => member.familyName?.trim().toLowerCase() === familyName.trim().toLowerCase()
      )

      await Promise.all(
        familyMembers.map((member) => deleteDoc(doc(db, 'familyMembers', member.id))),
      )

      setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }

  return {
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
    defaultFamilyName: DEFAULT_FAMILY_NAME,
  }
}
