import { DateTimePicker } from "@mantine/dates";
import { Paper } from "@mantine/core";
import { memo, useRef } from 'react';

const DateTimeOut = memo(({
  label = null,
  timeOut,
  onChange,
  readOnly
}) => {
  const inputRef = useRef(null);

  const handleChange = (value) => {
    onChange(value);
    // Keep focus on the input so the user can still use 
    // the Tab key to leave when they are truly done.
    inputRef.current?.focus();
  };

  return (
    <DateTimePicker
      label={label}
      readOnly={readOnly}
      onChange={handleChange}
      value={timeOut}
      dropdownType="modal"
      valueFormat="YYYY-MM-DD HH:mm"
      styles={{
        input: {
          padding: '0 5px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }
      }}
      variant="default"
      placeholder="Input Time Out"
    />
  );
})

export default DateTimeOut;
