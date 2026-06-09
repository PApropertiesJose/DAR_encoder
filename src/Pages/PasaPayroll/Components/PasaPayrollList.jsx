import { Container, Stack, Group, Box, Paper, ThemeIcon, Text, Table, Divider, Checkbox, Skeleton } from "@mantine/core";
import { HardHat } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo } from "react";
import ErrorElement from "~/components/ErrorElement";
import useFetchPasaPayroll from "~/hooks/Admins/useFetchPasaPayroll";
import { usePasaPayrollContext } from "../context";

const TableRows = memo(() => {
  const { data, isLoading, isError, error, isSuccess } = useFetchPasaPayroll();
  const { pasaPayrollName, pasaPayrollAdmins, onManagePopulateAdmins, handleUpdateStatusAdmins } = usePasaPayrollContext();

  useEffect(() => {
    if(isSuccess) {
      onManagePopulateAdmins(data?.data);
    }
  }, [isSuccess, data, onManagePopulateAdmins])

  const filteredResult = useMemo(() => {
    if(isSuccess && !pasaPayrollName || pasaPayrollName.length == 0) return pasaPayrollAdmins;

    const searchQuery = pasaPayrollName.toLowerCase();

    return pasaPayrollAdmins.filter((item) => {
      const matchName = item.name.toLowerCase().includes(searchQuery);
      const matchPosition = item.position.toLowerCase().includes(searchQuery);

      return matchName || matchPosition
    }) 
  }, [pasaPayrollName, isSuccess, pasaPayrollAdmins])

  if (isLoading) {
    return (
      <Table.Tbody>
        {Array(3).fill().map((_, index) => (
          <Table.Tr key={index}>
            <Table.Td colSpan={6}>
              <Skeleton h={60} />
            </Table.Td>
          </Table.Tr>
        ))}

      </Table.Tbody>
    )
  }

  if (isError) {
    const errorMessage = error.response?.data.errorMessage ?? error.message;
    return (
      <Table.Tbody>
        <Table.Tr>
          <Table.Td colSpan={6}>
            <ErrorElement>{errorMessage}</ErrorElement>
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    )
  }

  return (
    <Table.Tbody>
      {filteredResult?.map((admin, index) => (
        <Table.Tr key={index}>
          <Table.Td>{admin.empseriesid}</Table.Td>
          <Table.Td>{admin.name}</Table.Td>
          <Table.Td>{admin.position}</Table.Td>
          <Table.Td>{admin.reg_rate}</Table.Td>
          <Table.Td>{admin.ot_rate}</Table.Td>
          <Table.Td style={{ textAlign: 'center' }}>
            <Checkbox checked={admin.is_active} onChange={(e) => handleUpdateStatusAdmins(e,admin)}/>
          </Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  );
});

const PasaPayrollTable = memo(() => {
  return (
    <Table.ScrollContainer maxHeight={`calc(100vh - 490px)`}>
      <Table
        withColumnBorders
        withRowBorders
        withTableBorder
        striped
        stickyHeader
        stickyHeaderOffset={0}
      >
        <Table.Thead >
          <Table.Tr >
            <Table.Th bg="primary.7" w={120}>EMPSERIES ID</Table.Th>
            <Table.Th bg="primary.7">Name</Table.Th>
            <Table.Th bg="primary.7" >Position</Table.Th>
            <Table.Th bg="primary.7" w={150}>Regular Rate</Table.Th>
            <Table.Th bg="primary.7" w={150}>Overtime Rate</Table.Th>
            <Table.Th bg="primary.7" w={60} style={{ textAlign: 'center' }}>Active</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <TableRows />
      </Table>
    </Table.ScrollContainer>
  );
})

const PasaPayrollList = memo(() => {
  return (
    <Paper
      mt={10}
      radius="lg"
      shadow="sm"
    >
      <Group>
        <ThemeIcon variant="light" c="primary.8" size={50}>
          <HardHat />
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="sm" fw={700}>Pasa Payroll List</Text>
          <Text size="xs" c="dimmed">Admin Workers details</Text>
        </Stack>
      </Group>
      <Divider my={10} />
      <PasaPayrollTable />
    </Paper>
  )
})

export default PasaPayrollList;
