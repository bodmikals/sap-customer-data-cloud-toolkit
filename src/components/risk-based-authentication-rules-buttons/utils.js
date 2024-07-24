/*
 * Copyright: Copyright 2023 SAP SE or an SAP affiliate company and cdc-tools-chrome-extension contributors
 * License: Apache-2.0
 */

export const handleRadioButtonChange = (event, treeNode, setRbaRulesMergeOrReplace, t, dispatch) => {
  const selectedItem = event.target
  if (selectedItem) {
    const selectedButton = selectedItem.text.trim()
    if (selectedButton === t('CONFIGURATION_TREE.BUTTON_MERGE')) {
      dispatch(setRbaRulesMergeOrReplace({ checkBoxId: treeNode.id, mergeOrReplace: 'merge' }))
    } else {
      dispatch(setRbaRulesMergeOrReplace({ checkBoxId: treeNode.id, mergeOrReplace: 'replace' }))
    }
  }
}

// Handles RBA checkbox state
export const handleRBACheckboxChange = (checkBoxId, value, setIsRBAChecked) => {
  if (checkBoxId === 'rba' || checkBoxId === 'RBA Rules') {
    setIsRBAChecked(value)
  }
}
