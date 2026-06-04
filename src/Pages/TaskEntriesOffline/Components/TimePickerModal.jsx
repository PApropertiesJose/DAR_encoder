import { Modal, Text, Button, Group, Stack, ActionIcon, TextInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const Spinner = ({ value, min, max, onChange }) => (
  <Stack gap={2} align="center">
    <ActionIcon variant="subtle" tabIndex={-1} onClick={() => onChange(value >= max ? min : value + 1)}>
      <ChevronUp size={16} />
    </ActionIcon>
    <TextInput
      value={pad(value)}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        if (!isNaN(parsed)) onChange(clamp(parsed, min, max));
      }}
      onFocus={(e) => e.target.select()}
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
    <ActionIcon variant="subtle" tabIndex={-1} onClick={() => onChange(value <= min ? max : value - 1)}>
      <ChevronDown size={16} />
    </ActionIcon>
  </Stack>
);

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

  const handleRawChange = (e) => {
    const val = e.target.value;
    setRawInput(val);
    const parsed = parseRaw(val);
    if (parsed) {
      setHour(parsed.h);
      setMinute(parsed.m);
      setRawError('');
    } else {
      setRawError('Use format: HH:MM  (00:00 – 23:59)');
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
            placeholder="14:30"
            value={rawInput}
            onChange={handleRawChange}
            error={rawError}
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
