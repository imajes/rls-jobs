function asOption(option) {
  return {
    text: {
      type: 'plain_text',
      text: option.text,
      emoji: true,
    },
    value: option.value,
  };
}

function staticSelectElement(actionId, placeholder, options, initialValue = null) {
  const element = {
    type: 'static_select',
    action_id: actionId,
    placeholder: {
      type: 'plain_text',
      text: placeholder,
      emoji: true,
    },
    options: options.map(asOption),
  };

  if (initialValue) {
    const initialOption = options.find((option) => option.value === initialValue);
    if (initialOption) {
      element.initial_option = asOption(initialOption);
    }
  }

  return element;
}

function plainTextInputElement(actionId, placeholder, { multiline = false } = {}) {
  return {
    type: 'plain_text_input',
    action_id: actionId,
    multiline,
    placeholder: {
      type: 'plain_text',
      text: placeholder,
      emoji: true,
    },
  };
}

module.exports = { asOption, plainTextInputElement, staticSelectElement };
