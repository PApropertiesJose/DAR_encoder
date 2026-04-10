import { DateTimePicker } from "@mantine/dates";
import { Paper } from "@mantine/core";
import { memo } from 'react';

const DateTimeOut = memo(({
  timeOut,
  onChange,
  readOnly
}) => {

  return (
    <DateTimePicker
      readOnly={readOnly}
      onChange={(e) => onChange(e)}
      value={timeOut}
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
