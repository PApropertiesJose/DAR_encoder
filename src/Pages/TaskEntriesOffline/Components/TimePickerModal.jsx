import { Modal, Text, Button, Group, Stack, ActionIcon, TextInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const Spinner = ({ value, min, max, onChange }) => {
  // Hold the raw text while typing. Padding on every keystroke turns a
  // half-typed "1" into "01", which then swallows the second digit.
  const [draft, setDraft] = useState(null);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDraft(digits);
    const parsed = parseInt(digits);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
  };

  // Out-of-range or empty entries settle back to something legal on exit.
  const handleBlur = () => {
    if (draft) onChange(clamp(parseInt(draft), min, max));
    setDraft(null);
  };

  const step = (next) => {
    setDraft(null);
    onChange(next);
  };

  return (
    <Stack gap={2} align="center">
      <ActionIcon variant="subtle" tabIndex={-1} onClick={() => step(value >= max ? min : value + 1)}>
        <ChevronUp size={16} />
      </ActionIcon>
      <TextInput
        value={draft ?? pad(value)}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        onBlur={handleBlur}
        inputMode="numeric"
        styles={{
          input: {
            width: 48,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 20,
            padding: 0,
          },
        }}
      />
      <ActionIcon variant="subtle" tabIndex={-1} onClick={() => step(value <= min ? max : value - 1)}>
        <ChevronDown size={16} />
      </ActionIcon>
    </Stack>
  );
};

const TimePickerModal = ({ opened, onClose, onConfirm, label = 'Select Time', initialTime = null }) => {
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [rawInput, setRawInput] = useState('');
  const [rawError, setRawError] = useState('');

  useEffect(() => {
    if (opened) {
      setRawError('');
      if (initialTime) {
        const match = initialTime.match(/^(\d{1,2}):(\d{2})$/);
        if (match) {
          setHour(parseInt(match[1]));
          setMinute(parseInt(match[2]));
          setRawInput(initialTime);
          return;
        }
      }
      const now = new Date();
      setHour(now.getHours());
      setMinute(now.getMinutes());
      setRawInput(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }
  }, [opened, initialTime]);

  useEffect(() => {
    setRawInput(`${pad(hour)}:${pad(minute)}`);
    setRawError('');
  }, [hour, minute]);

  const parseRaw = (val) => {
    const match = val.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { h, m };
  };

  // The numeric keypad has no colon key, so keep only digits and place the
  // separator ourselves: "1430" types out as "14:30".
  const formatRaw = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  };

  const handleRawChange = (e) => {
    const val = formatRaw(e.target.value);
    setRawInput(val);
    const parsed = parseRaw(val);
    if (parsed) {
      setHour(parsed.h);
      setMinute(parsed.m);
      setRawError('');
    } else {
      setRawError('Enter 4 digits: HHMM  (0000 – 2359)');
    }
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (rawError) return;
    onConfirm(`${pad(hour)}:${pad(minute)}`);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{label}</Text>}
      centered
      size="xs"
    >
      <form onSubmit={handleConfirm}>
        <Stack align="center" gap="md">
          <Group gap="xs" align="center">
            <Spinner value={hour} min={0} max={23} onChange={(v) => setHour(clamp(v, 0, 23))} />
            <Text fw={700} size="xl">:</Text>
            <Spinner value={minute} min={0} max={59} onChange={(v) => setMinute(clamp(v, 0, 59))} />
          </Group>

          <TextInput
            label="Or type directly"
            placeholder="1430"
            value={rawInput}
            onChange={handleRawChange}
            onFocus={(e) => e.target.select()}
            error={rawError}
            inputMode="numeric"
            w="100%"
            styles={{ input: { textAlign: 'center', fontFamily: 'monospace' } }}
          />

          <Group justify="flex-end" w="100%">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button disabled={!!rawError} type="submit">Confirm</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default TimePickerModal;
