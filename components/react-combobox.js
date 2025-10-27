const { useState, useEffect } = React;
const { Autocomplete, TextField } = MaterialUI;

window.Combobox = ({
  strArray = [],
  selectedValue = null,
  onCallbackChange = () => {},
}) => {
  const [value, setValue] = useState(selectedValue || null);

  useEffect(() => {
    setValue(selectedValue || null);
  }, [selectedValue]);

  return (
    <Autocomplete
      disablePortal
      options={strArray}
      value={value}
      /* duplicates in array make React scream that keys should be unique */
      onChange={(event, newValue) => {
        setValue(newValue);
        onCallbackChange(newValue);
      }}
      renderInput={(params) => (
        <TextField {...params} label="Select region" variant="outlined" />
      )}
      sx={{ width: 300 }}
    />
  );
};

/* Updates ReactDom element */
window.renderCombobox = (
  props = {
    container,
    list: [],
    value: null,
    onCallbackChange: () => {},
  }
) => {
  const { container, list, value, onCallbackChange } = props;

  container.render(
    <Combobox
      strArray={list}
      selectedValue={value}
      onCallbackChange={onCallbackChange}
    />
  );
};
