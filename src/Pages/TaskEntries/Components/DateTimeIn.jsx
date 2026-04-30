import { DateTimePicker } from "@mantine/dates";
import { memo, useRef } from 'react';

const DateTimeIn = memo(({
  label,
  timeIn,
  onChange,
  readOnly = false
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
      ref={inputRef}
      readOnly={readOnly}
      value={timeIn}
      onChange={handleChange}
      valueFormat="YYYY-MM-DD HH:mm"
      // This ensures that clicking a date moves to time 
      // without losing the dropdown state
      dropdownType="modal"
      withinPortal={true}
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
});

export default DateTimeIn;// import { DateInput, DateTimePicker } from "@mantine/dates";
// import { memo } from 'react';
//
// const DateTimeIn = memo(({
//   timeIn,
//   onChange,
//   readOnly = false
// }) => {
//   return (
//     <DateTimePicker
//       readOnly={readOnly}
//       onChange={(e) => onChange(e)}
//       value={timeIn}
//       valueFormat="YYYY-MM-DD HH:mm"
//       styles={{
//         input: {
//           padding: '0 5px',
//           fontFamily: 'monospace',
//           letterSpacing: '0.05em'
//         }
//       }}
//       variant="default"
//       placeholder="Input Time In"
//     />
//   );
// })
//
// export default DateTimeIn;
