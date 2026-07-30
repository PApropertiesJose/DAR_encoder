import { Modal, Stack, Text, Button, Group, ActionIcon, Tooltip } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import useFetchUnits from '~/hooks/TaskEntries/useFetchUnits';
import SearchablePicker from './SearchablePicker';

const BlkLotModal = ({ opened, onClose, onConfirm, params }) => {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);

  const { data: units, loading, resync, syncing } = useFetchUnits(params);

  const blockOptions = useMemo(() => {
    if (!Array.isArray(units)) return [];
    return units.map((u) => ({ value: u.block, label: u.block }));
  }, [units]);

  const lots = useMemo(() => {
    if (!selectedBlock || !Array.isArray(units)) return [];
    const unit = units.find((u) => u.block === selectedBlock);
    return unit?.lots ?? [];
  }, [units, selectedBlock]);

  const lotOptions = useMemo(
    () => lots.map((l) => ({ value: l.itemNo, label: l.itemNo })),
    [lots]
  );

  const handleClose = () => {
    setSelectedBlock(null);
    setSelectedLot(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedBlock || !selectedLot) return;
    const lotObject = lots.find((l) => l.itemNo === selectedLot);
    const modelCode = lotObject?.modelCode ?? lotObject?.model ?? null;
    onConfirm({ block: selectedBlock, lot: selectedLot, modelCode });
    setSelectedBlock(null);
    setSelectedLot(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Select Block &amp; Lot</Text>
          <Tooltip label="Resync offline data" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              loading={syncing}
              onClick={resync}
            >
              <RefreshCw size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      centered
      size="sm"
    >
      <Stack gap="md">
        <SearchablePicker
          label="Block"
          placeholder={loading ? 'Loading...' : 'Select block'}
          data={blockOptions}
          value={selectedBlock}
          onChange={(val) => {
            setSelectedBlock(val);
            setSelectedLot(null);
          }}
          loading={loading}
          searchInputMode="numeric"
          clearable
        />
        <SearchablePicker
          label="Lot"
          placeholder={!selectedBlock ? 'Select a block first' : 'Select lot'}
          data={lotOptions}
          value={selectedLot}
          onChange={setSelectedLot}
          disabled={!selectedBlock}
          searchInputMode="numeric"
          clearable
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose}>Cancel</Button>
          <Button disabled={!selectedBlock || !selectedLot} onClick={handleConfirm}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default BlkLotModal;
