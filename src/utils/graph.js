const CONFIG = {
  NODE_WIDTH: 118,
  NODE_HEIGHT: 138,
  LEVEL_GAP: 210,
  SPOUSE_GAP: 14,
  MULTI_SPOUSE_GAP: 116,
  CHILD_GAP: 40,
  ROOT_CLUSTER_GAP: 120,
  ROOT_PADDING_X: 40,
  MARRIAGE_Y_OFFSET: 43,
  CHILD_HUB_Y_OFFSET: 168,
  FAMILY_VERTICAL_GAP: 136,
  CONNECTOR_SIZE: 10,
  GENERATION_COLORS: ['#5fbfc9', '#f2b84b', '#8fd26c', '#7b9af7', '#d28bc8'],
}

const sortIds = (ids) => [...ids].sort()

const getPairKey = (a, b) => sortIds([a, b]).join(':')

const getFamilyKey = (parentIds) => sortIds(parentIds).join(':')

const isFiniteNumber = (value) => Number.isFinite(value)

const normalizeMembers = (members) =>
  members.map((member) => ({
    ...member,
    parentIds: [...(member.parentIds || [])],
    spouseIds: [...(member.spouseIds || [])],
  }))

const orderPair = (a, b, byId) => {
  const memberA = byId.get(a)
  const memberB = byId.get(b)

  if (memberA?.gender === 'Perempuan' && memberB?.gender === 'Laki-laki') {
    return [a, b]
  }

  if (memberA?.gender === 'Laki-laki' && memberB?.gender === 'Perempuan') {
    return [b, a]
  }

  return [a, b].sort((left, right) =>
    (byId.get(left)?.fullName || '').localeCompare(byId.get(right)?.fullName || ''),
  )
}

const getOrderedPartners = (centerId, componentIds, byId) => {
  const centerMember = byId.get(centerId)
  const partnerIds = componentIds.filter((id) => id !== centerId)
  const spouseOrder = centerMember?.spouseIds || []

  return [...partnerIds].sort((left, right) => {
    const leftIndex = spouseOrder.indexOf(left)
    const rightIndex = spouseOrder.indexOf(right)
    const safeLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex
    const safeRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex

    if (safeLeftIndex !== safeRightIndex) {
      return safeLeftIndex - safeRightIndex
    }

    return (byId.get(left)?.fullName || '').localeCompare(byId.get(right)?.fullName || '')
  })
}

const buildGenerationMap = (members, byId) => {
  const generationMap = {}

  const visit = (id) => {
    if (generationMap[id] !== undefined) return generationMap[id]

    const member = byId.get(id)
    if (!member || !member.parentIds.length) {
      generationMap[id] = 0
      return 0
    }

    generationMap[id] =
      Math.max(
        ...member.parentIds.map((parentId) =>
          byId.has(parentId) ? visit(parentId) + 1 : 0,
        ),
      ) || 0

    return generationMap[id]
  }

  members.forEach((member) => visit(member.id))

  let changed = true
  while (changed) {
    changed = false

    members.forEach((member) => {
      member.spouseIds.forEach((spouseId) => {
        if (generationMap[spouseId] === undefined) return

        const nextGeneration = Math.max(
          generationMap[member.id] ?? 0,
          generationMap[spouseId] ?? 0,
        )

        if (generationMap[member.id] !== nextGeneration) {
          generationMap[member.id] = nextGeneration
          changed = true
        }

        if (generationMap[spouseId] !== nextGeneration) {
          generationMap[spouseId] = nextGeneration
          changed = true
        }
      })
    })
  }

  return generationMap
}

const collectFamilies = (members) => {
  const familyGroups = new Map()

  members.forEach((member) => {
    if (!member.parentIds.length) return

    const key = getFamilyKey(member.parentIds)
    if (!familyGroups.has(key)) {
      familyGroups.set(key, {
        key,
        parentIds: sortIds(member.parentIds),
        childIds: [],
      })
    }

    familyGroups.get(key).childIds.push(member.id)
  })

  familyGroups.forEach((family) => {
    family.childIds.sort()
  })

  return familyGroups
}

const buildGenerationBuckets = (members, generationMap) => {
  const buckets = new Map()

  members.forEach((member) => {
    const generation = generationMap[member.id]
    if (!buckets.has(generation)) buckets.set(generation, [])
    buckets.get(generation).push(member.id)
  })

  return buckets
}

const buildSpouseClusters = (generationBuckets, byId) => {
  const clusters = new Map()
  const clusterByMemberId = new Map()

  Array.from(generationBuckets.keys())
    .sort((a, b) => a - b)
    .forEach((generation) => {
      const memberIds = generationBuckets.get(generation) || []
      const idSet = new Set(memberIds)
      const adjacency = new Map(memberIds.map((id) => [id, new Set()]))

      memberIds.forEach((id) => {
        const member = byId.get(id)
        member.spouseIds.forEach((spouseId) => {
          if (!idSet.has(spouseId)) return
          adjacency.get(id).add(spouseId)
          adjacency.get(spouseId).add(id)
        })
      })

      const visited = new Set()
      const sortedIds = [...memberIds].sort((left, right) =>
        (byId.get(left)?.fullName || '').localeCompare(byId.get(right)?.fullName || ''),
      )

      sortedIds.forEach((startId) => {
        if (visited.has(startId)) return

        const stack = [startId]
        const component = []

        while (stack.length) {
          const currentId = stack.pop()
          if (!currentId || visited.has(currentId)) continue
          visited.add(currentId)
          component.push(currentId)

          adjacency.get(currentId)?.forEach((neighborId) => {
            if (!visited.has(neighborId)) stack.push(neighborId)
          })
        }

        let orderedIds = []
        let centerId = null

        if (component.length === 1) {
          orderedIds = [component[0]]
        } else if (component.length === 2) {
          orderedIds = orderPair(component[0], component[1], byId)
        } else {
          const degreeRank = component
            .map((id) => ({ id, degree: adjacency.get(id)?.size || 0 }))
            .sort((a, b) => b.degree - a.degree)

          centerId = degreeRank[0]?.degree >= 2 ? degreeRank[0].id : component[0]
          const others = getOrderedPartners(centerId, component, byId)

          const leftSide = []
          const rightSide = []

          others.forEach((id, index) => {
            if (index % 2 === 0) leftSide.unshift(id)
            else rightSide.push(id)
          })

          orderedIds = [...leftSide, centerId, ...rightSide]
        }

        const clusterId = `cluster:${generation}:${clusters.size}`
        const cluster = {
          id: clusterId,
          generation,
          ids: orderedIds,
          centerId,
        }

        clusters.set(clusterId, cluster)
        orderedIds.forEach((id) => clusterByMemberId.set(id, clusterId))
      })
    })

  return { clusters, clusterByMemberId }
}

const addConnectorNode = (nodes, id, x, y, color, size = CONFIG.CONNECTOR_SIZE) => {
  nodes.push({
    id,
    type: 'connector',
    position: {
      x: x - size / 2,
      y: y - size / 2,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    data: {
      color,
      size,
    },
  })
}

const addEdge = (
  edges,
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  color,
  type = 'straight',
) => {
  edges.push({
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type,
    animated: false,
    selectable: false,
    style: {
      stroke: color,
      strokeWidth: 2.2,
    },
  })
}

export function buildGraph(members, selectedId = null) {
  const normalizedMembers = normalizeMembers(members)
  const byId = new Map(normalizedMembers.map((member) => [member.id, member]))
  const generationMap = buildGenerationMap(normalizedMembers, byId)
  const families = collectFamilies(normalizedMembers)
  const generationBuckets = buildGenerationBuckets(normalizedMembers, generationMap)
  const { clusters, clusterByMemberId } = buildSpouseClusters(generationBuckets, byId)

  const familiesByClusterId = new Map()
  families.forEach((family) => {
    const clusterIds = family.parentIds
      .map((parentId) => clusterByMemberId.get(parentId))
      .filter(Boolean)

    if (!clusterIds.length) return
    const primaryClusterId = clusterIds[0]

    if (!familiesByClusterId.has(primaryClusterId)) {
      familiesByClusterId.set(primaryClusterId, [])
    }

    familiesByClusterId.get(primaryClusterId).push(family)
  })

  const clusterMetaMemo = new Map()
  const familySpanMemo = new Map()

  const computeFamilyChildrenSpan = (familyKey) => {
    if (familySpanMemo.has(familyKey)) return familySpanMemo.get(familyKey)

    const family = families.get(familyKey)
    if (!family) {
      familySpanMemo.set(familyKey, 0)
      return 0
    }

    const childWidths = family.childIds.map((childId) => {
      const childClusterId = clusterByMemberId.get(childId)
      if (!childClusterId) return CONFIG.NODE_WIDTH
      const childMeta = computeClusterMeta(childClusterId)
      return childMeta.right - childMeta.left
    })

    const span =
      childWidths.reduce((sum, width) => sum + width, 0) +
      Math.max(0, childWidths.length - 1) * CONFIG.CHILD_GAP

    familySpanMemo.set(familyKey, span)
    return span
  }

  const computeClusterMeta = (clusterId) => {
    if (clusterMetaMemo.has(clusterId)) return clusterMetaMemo.get(clusterId)

    const cluster = clusters.get(clusterId)
    const memberOffsets = {}

    if (cluster.ids.length === 1) {
      memberOffsets[cluster.ids[0]] = 0
    } else if (cluster.ids.length === 2) {
      const [leftId, rightId] = cluster.ids
      const distance = CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP
      memberOffsets[leftId] = -distance / 2
      memberOffsets[rightId] = distance / 2
    } else {
      const centerId = cluster.centerId
      const orderedPartners = getOrderedPartners(centerId, cluster.ids, byId)
      memberOffsets[centerId] = 0

      orderedPartners.forEach((partnerId, index) => {
        const familySpan = computeFamilyChildrenSpan(getPairKey(centerId, partnerId))
        const baseDistance = Math.max(
          CONFIG.NODE_WIDTH + CONFIG.MULTI_SPOUSE_GAP,
          familySpan + CONFIG.CHILD_GAP,
        )
        const distance = baseDistance + index * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP)
        const direction = index % 2 === 0 ? -1 : 1
        memberOffsets[partnerId] = direction * distance
      })
    }

    let left = Math.min(
      ...cluster.ids.map((id) => (memberOffsets[id] ?? 0) - CONFIG.NODE_WIDTH / 2),
    )
    let right = Math.max(
      ...cluster.ids.map((id) => (memberOffsets[id] ?? 0) + CONFIG.NODE_WIDTH / 2),
    )

    if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
      left = -CONFIG.NODE_WIDTH / 2
      right = CONFIG.NODE_WIDTH / 2
    }

    const familyLayouts = new Map()
    const childFamilies = (familiesByClusterId.get(clusterId) || [])
      .map((family) => {
        const idealCenter =
          family.parentIds.length === 2
            ? ((memberOffsets[family.parentIds[0]] ?? 0) +
                (memberOffsets[family.parentIds[1]] ?? 0)) /
              2
            : (memberOffsets[family.parentIds[0]] ?? 0)

        const childBoxes = family.childIds.map((childId) => {
          const childClusterId = clusterByMemberId.get(childId)
          const childMeta = computeClusterMeta(childClusterId)
          const childOffset = childMeta.memberOffsets[childId] ?? 0
          return {
            childId,
            width:
              (childMeta.right ?? CONFIG.NODE_WIDTH / 2) -
              (childMeta.left ?? -CONFIG.NODE_WIDTH / 2),
            left: (childMeta.left ?? -CONFIG.NODE_WIDTH / 2) - childOffset,
            right: (childMeta.right ?? CONFIG.NODE_WIDTH / 2) - childOffset,
          }
        })

        const totalWidth =
          childBoxes.reduce((sum, child) => sum + child.width, 0) +
          Math.max(0, childBoxes.length - 1) * CONFIG.CHILD_GAP

        let cursor = idealCenter - totalWidth / 2
        const childAnchorOffsets = new Map()
        let localLeft = Infinity
        let localRight = -Infinity

        childBoxes.forEach((childBox) => {
          const childAnchor = cursor - childBox.left
          const placedLeft = childAnchor + childBox.left
          const placedRight = childAnchor + childBox.right

          childAnchorOffsets.set(childBox.childId, childAnchor)
          localLeft = Math.min(localLeft, placedLeft)
          localRight = Math.max(localRight, placedRight)
          cursor += childBox.width + CONFIG.CHILD_GAP
        })

        return {
          key: family.key,
          idealCenter,
          childAnchorOffsets,
          left: localLeft,
          right: localRight,
        }
      })
      .sort((a, b) => a.idealCenter - b.idealCenter)

    let previousRight = -Infinity

    childFamilies.forEach((layout) => {
      let shift = 0

      if (isFiniteNumber(previousRight) && layout.left < previousRight + CONFIG.CHILD_GAP) {
        shift = previousRight + CONFIG.CHILD_GAP - layout.left
      }

      const shiftedChildAnchorOffsets = new Map(
        Array.from(layout.childAnchorOffsets.entries()).map(([childId, anchor]) => [
          childId,
          anchor + shift,
        ]),
      )

      const shiftedLeft = layout.left + shift
      const shiftedRight = layout.right + shift

      left = Math.min(left, shiftedLeft)
      right = Math.max(right, shiftedRight)
      previousRight = shiftedRight

      familyLayouts.set(layout.key, {
        familyCenter: layout.idealCenter + shift,
        childAnchorOffsets: shiftedChildAnchorOffsets,
      })
    })

    const meta = {
      memberOffsets,
      familyLayouts,
      left,
      right,
    }

    clusterMetaMemo.set(clusterId, meta)
    return meta
  }

  const absoluteMemberCenters = new Map()
  const placedClusters = new Set()

  const placeCluster = (clusterId, centerX) => {
    if (placedClusters.has(clusterId)) return
    placedClusters.add(clusterId)

    const cluster = clusters.get(clusterId)
    const meta = computeClusterMeta(clusterId)
    const generationY = cluster.generation * CONFIG.LEVEL_GAP

    cluster.ids.forEach((memberId) => {
      absoluteMemberCenters.set(memberId, centerX + (meta.memberOffsets[memberId] ?? 0))
    })

    const childFamilies = familiesByClusterId.get(clusterId) || []
    childFamilies.forEach((family) => {
      const familyLayout = meta.familyLayouts.get(family.key)
      if (!familyLayout) return

      family.childIds.forEach((childId) => {
        const childClusterId = clusterByMemberId.get(childId)
        const childMeta = computeClusterMeta(childClusterId)
        const childAnchor = familyLayout.childAnchorOffsets.get(childId)
        const childClusterCenter =
          centerX + childAnchor - (childMeta.memberOffsets[childId] ?? 0)

        placeCluster(childClusterId, childClusterCenter)
      })
    })

    cluster.ids.forEach((memberId) => {
      const center = absoluteMemberCenters.get(memberId)
      absoluteMemberCenters.set(memberId, {
        x: center,
        y: generationY,
      })
    })
  }

  const rootClusterIds = Array.from(clusters.values())
    .filter((cluster) => cluster.generation === 0)
    .sort((left, right) => left.ids.join(':').localeCompare(right.ids.join(':')))
    .map((cluster) => cluster.id)

  let cursorX = CONFIG.ROOT_PADDING_X
  rootClusterIds.forEach((clusterId) => {
    const meta = computeClusterMeta(clusterId)
    const width = meta.right - meta.left
    const centerX = cursorX - meta.left
    placeCluster(clusterId, centerX)
    cursorX += width + CONFIG.ROOT_CLUSTER_GAP
  })

  const personNodes = normalizedMembers.map((member) => {
    const absolute = absoluteMemberCenters.get(member.id) || {
      x: CONFIG.ROOT_PADDING_X,
      y: generationMap[member.id] * CONFIG.LEVEL_GAP,
    }
    const generation = generationMap[member.id]

    return {
      id: member.id,
      type: 'person',
      position: {
        x: absolute.x - CONFIG.NODE_WIDTH / 2,
        y: absolute.y,
      },
      draggable: false,
      selected: member.id === selectedId,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        ...member,
        generationLabel: `Generasi ${generation + 1}`,
        generationColor:
          CONFIG.GENERATION_COLORS[generation % CONFIG.GENERATION_COLORS.length],
      },
    }
  })

  const nodeLookup = new Map(personNodes.map((node) => [node.id, node]))
  const connectorNodes = []
  const edges = []
  const marriageConnectors = new Map()
  const spousePairs = new Set()

  normalizedMembers.forEach((member) => {
    member.spouseIds.forEach((spouseId) => {
      if (!byId.has(spouseId)) return
      if (generationMap[spouseId] !== generationMap[member.id]) return
      spousePairs.add(getPairKey(member.id, spouseId))
    })
  })

  families.forEach((family) => {
    if (family.parentIds.length === 2) {
      spousePairs.add(getPairKey(family.parentIds[0], family.parentIds[1]))
    }
  })

  Array.from(spousePairs)
    .sort()
    .forEach((pairKey) => {
      const [a, b] = pairKey.split(':')
      const nodeA = nodeLookup.get(a)
      const nodeB = nodeLookup.get(b)
      if (!nodeA || !nodeB) return

      const centerA = nodeA.position.x + CONFIG.NODE_WIDTH / 2
      const centerB = nodeB.position.x + CONFIG.NODE_WIDTH / 2
      const [leftId, rightId] = centerA <= centerB ? [a, b] : [b, a]
      const leftNode = nodeLookup.get(leftId)
      const rightNode = nodeLookup.get(rightId)
      const leftCenter = leftNode.position.x + CONFIG.NODE_WIDTH / 2
      const rightCenter = rightNode.position.x + CONFIG.NODE_WIDTH / 2
      const connectorY = leftNode.position.y + CONFIG.MARRIAGE_Y_OFFSET
      const generation = generationMap[a]
      const color = CONFIG.GENERATION_COLORS[generation % CONFIG.GENERATION_COLORS.length]
      const connectorId = `marriage:${pairKey}`

      addConnectorNode(
        connectorNodes,
        connectorId,
        (leftCenter + rightCenter) / 2,
        connectorY,
        color,
      )

      addEdge(
        edges,
        `spouse:${pairKey}:left`,
        leftId,
        connectorId,
        'spouse-right',
        'left',
        color,
      )
      addEdge(
        edges,
        `spouse:${pairKey}:right`,
        connectorId,
        rightId,
        'right',
        'spouse-left',
        color,
      )

      marriageConnectors.set(pairKey, {
        id: connectorId,
        x: (leftCenter + rightCenter) / 2,
        y: connectorY,
      })
    })

  Array.from(families.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .forEach((family) => {
      if (!family.childIds.length) return

      const childNodes = family.childIds
        .map((childId) => {
          const node = nodeLookup.get(childId)
          if (!node) return null
          return {
            id: childId,
            x: node.position.x + CONFIG.NODE_WIDTH / 2,
            y: node.position.y,
          }
        })
        .filter(Boolean)
        .sort((left, right) => left.x - right.x)

      if (!childNodes.length) return

      const childGeneration = generationMap[family.childIds[0]]
      const color =
        CONFIG.GENERATION_COLORS[childGeneration % CONFIG.GENERATION_COLORS.length]

      let parentCenterX = null
      let sourceId = null
      let sourceHandle = 'bottom'
      let sourceY = null

      if (family.parentIds.length === 2) {
        const pairKey = getPairKey(family.parentIds[0], family.parentIds[1])
        const marriage = marriageConnectors.get(pairKey)
        if (!marriage) return
        parentCenterX = marriage.x
        sourceId = marriage.id
        sourceY = marriage.y
      } else if (family.parentIds.length === 1) {
        const parentNode = nodeLookup.get(family.parentIds[0])
        if (!parentNode) return
        parentCenterX = parentNode.position.x + CONFIG.NODE_WIDTH / 2
        sourceId = family.parentIds[0]
        sourceHandle = 'descendant-source'
        sourceY = parentNode.position.y + CONFIG.MARRIAGE_Y_OFFSET
      }

      if (parentCenterX == null || !sourceId || sourceY == null) return

      const desiredHubY = childNodes[0].y - CONFIG.CHILD_HUB_Y_OFFSET
      const minHubY = sourceY + CONFIG.FAMILY_VERTICAL_GAP
      const hubY = Math.max(desiredHubY, minHubY)
      const hubId = `family-hub:${family.key}`

      addConnectorNode(connectorNodes, hubId, parentCenterX, hubY, color)
      addEdge(
        edges,
        `family-drop:${family.key}`,
        sourceId,
        hubId,
        sourceHandle,
        'top',
        color,
      )

      const branchPoints = childNodes.map((child) => {
        const branchId = `branch:${family.key}:${child.id}`
        addConnectorNode(connectorNodes, branchId, child.x, hubY, color, 9)
        addEdge(
          edges,
          `child-drop:${family.key}:${child.id}`,
          branchId,
          child.id,
          'bottom',
          'ancestor-target',
          color,
        )
        return { id: branchId, x: child.x }
      })

      const siblingPoints = [...branchPoints, { id: hubId, x: parentCenterX }].sort(
        (left, right) => left.x - right.x,
      )

      for (let index = 0; index < siblingPoints.length - 1; index += 1) {
        addEdge(
          edges,
          `sibling-line:${family.key}:${index}`,
          siblingPoints[index].id,
          siblingPoints[index + 1].id,
          'right',
          'left',
          color,
        )
      }
    })

  return {
    nodes: [...personNodes, ...connectorNodes],
    edges,
  }
}
