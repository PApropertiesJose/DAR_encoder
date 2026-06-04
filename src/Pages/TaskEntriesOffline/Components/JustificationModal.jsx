import { Modal, Stack, Text, Textarea, Button, Group } from '@mantine/core';
import { useEffect, useState } from 'react';

const JustificationModal = ({ opened, onClose, onConfirm, initialValue = '', timeOut }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (opened) setValue(initialValue ?? '');
  }, [opened, initialValue]);

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm(value.trim());
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Justification</Text>}
      centered
      size="md"
    >
      <form onSubmit={handleConfirm}>
        <Stack gap="md">
          {timeOut && (
            <Text size="xs" c="dimmed">
              This activity ends at {timeOut} (past 16:00) and requires a justification.
            </Text>
          )}
          <Textarea
            label="Reason"
            placeholder="Explain why this activity extends beyond 16:00…"
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            autosize
            minRows={3}
            maxRows={8}
            data-autofocus
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!value.trim()}>Save</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default JustificationModal;
