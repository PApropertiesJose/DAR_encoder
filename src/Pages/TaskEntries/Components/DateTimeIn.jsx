import { DateTimePicker } from "@mantine/dates";
import { Paper } from "@mantine/core";
import { memo } from 'react';

const DateTimeIn = memo(({
  timeIn,
  onChange
}) => {
  return (
    <DateTimePicker
      onChange={(e) => onChange(e)}
      value={timeIn}
      valueFormat="YYYY-MM-DD HH:mm"
      styles={{
        input: {
          padding: '0 5px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }
      }}
      variant="default"
      placeholder="Input Time In"
    />
  );
})

export default DateTimeIn;
