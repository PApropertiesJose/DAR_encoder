import { Modal, Stack, Text, Select, Loader, Button, Group } from '@mantine/core';
import { useMemo, useState } from 'react';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';
import useFetchLot from '~/hooks/Filters/useFetchLot';

const BlkLotModal = ({ opened, onClose, onConfirm, params }) => {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);

  const { data: blockData, isLoading: blocksLoading } = useFetchBlock({ params });

  const lotParams = useMemo(() => ({
    ...params,
    block: selectedBlock,
  }), [params, selectedBlock]);

  const { data: lotData, isLoading: lotsLoading } = useFetchLot({ params: lotParams });

  const blockOptions = useMemo(() => {
    const items = blockData?.data ?? blockData ?? [];
    if (!Array.isArray(items)) return [];
    return items.map((b) => ({
      value: b.code ?? b,
      label: b.code ?? b,
    }));
  }, [blockData]);

  const lotOptions = useMemo(() => {
    const items = lotData?.data ?? lotData ?? [];
    if (!Array.isArray(items)) return [];
    return items.map((l) => ({
      value: l.code ?? l,
      label: l.code ?? l,
    }));
  }, [lotData]);

  const handleClose = () => {
    setSelectedBlock(null);
    setSelectedLot(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedBlock || !selectedLot) return;
    onConfirm({ block: selectedBlock, lot: selectedLot });
    setSelectedBlock(null);
    setSelectedLot(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600}>Select Block &amp; Lot</Text>}
      centered
      size="sm"
    >
      <Stack gap="md">
        <Select
          label="Block"
          placeholder={blocksLoading ? 'Loading...' : 'Select block'}
          data={blockOptions}
          value={selectedBlock}
          onChange={(val) => {
            setSelectedBlock(val);
            setSelectedLot(null);
          }}
          rightSection={blocksLoading ? <Loader size={16} /> : undefined}
          searchable
          clearable
        />
        <Select
          label="Lot"
          placeholder={!selectedBlock ? 'Select a block first' : lotsLoading ? 'Loading...' : 'Select lot'}
          data={lotOptions}
          value={selectedLot}
          onChange={setSelectedLot}
          disabled={!selectedBlock}
          rightSection={lotsLoading && selectedBlock ? <Loader size={16} /> : undefined}
          searchable
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
