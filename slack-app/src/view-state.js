function getBlockAction(viewStateValues, blockId, actionId) {
  const block = viewStateValues?.[blockId];
  if (!block) {
    return null;
  }

  return block[actionId] || null;
}

function getInputValue(viewStateValues, blockId, actionId) {
  const action = getBlockAction(viewStateValues, blockId, actionId);
  return action?.value?.trim() || '';
}

function getStaticSelectValue(viewStateValues, blockId, actionId) {
  const action = getBlockAction(viewStateValues, blockId, actionId);
  return action?.selected_option?.value || '';
}

function getRadioValue(viewStateValues, blockId, actionId) {
  const action = getBlockAction(viewStateValues, blockId, actionId);
  return action?.selected_option?.value || '';
}

function getCheckboxValues(viewStateValues, blockId, actionId) {
  const action = getBlockAction(viewStateValues, blockId, actionId);
  return action?.selected_options?.map((opt) => opt.value) || [];
}

module.exports = {
  getCheckboxValues,
  getInputValue,
  getRadioValue,
  getStaticSelectValue,
};
