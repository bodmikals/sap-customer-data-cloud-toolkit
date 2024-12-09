export function rootOptionsValue(obj) {
  const results = []

  const traverse = (items) => {
    for (let item of items) {
      if (item.value === true && item.branches.length === 0) {
        results.push(`${item.id}`)
      }
      if (item.branches.length > 0) {
        traverse(item.branches)
      }
    }
  }

  traverse(obj)
  return results
}
