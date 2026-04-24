import {
  Button,
  Group, Box, Space, Container, Center, AppShell, Text,
  Paper, Table, Loader, TextInput, Stack, Checkbox,
} from "@mantine/core";
import { useParams } from "react-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import ErrorElement from "~/components/ErrorElement";
import SelectPhase from "~/components/Select/SelectPhase";
import useAdminStore from "~/hooks/Admins/useAdminStore";
import useFetchAdmins from "~/hooks/Admins/useFetchAdmins";
import useUpdateBadgeNumberAdminMutation from "~/hooks/Admins/useUpdateBadgeNumberAdminMutation";
import { notifications } from "@mantine/notifications";

// Debounce hook
function useDebounce(fn, delay = 400) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

const AdminRow = memo(({ item, onCheckChange, lastCheckedId }) => {
  const updateBadgeNumber = useAdminStore((state) => state.updateBadgeNumber)

  const debouncedUpdate = useDebounce((val) => {
    updateBadgeNumber(item.empseriesid, val)
  }, 400)

  const handleCheckChange = (e) => {
    onCheckChange(item.empseriesid, e.nativeEvent.shiftKey)
  }

  return (
    <Table.Tr>
      <Table.Td>{item.empseriesid}</Table.Td>
      <Table.Td>{item.name}</Table.Td>
      <Table.Td>
        <TextInput
          defaultValue={item.badgenumber}
          disabled={!item.isEdit}
          type="number"
          onChange={(e) => debouncedUpdate(e.currentTarget.value)}
        />
      </Table.Td>
      <Table.Td>
        <Checkbox
          checked={item.isEdit}
          onChange={handleCheckChange}
        />
      </Table.Td>
    </Table.Tr>
  )
})

const AdminList = memo(({
  params
}) => {
  const { data, isLoading, isError, error, isSuccess } = useFetchAdmins(params)
  const populateBadges = useAdminStore((state) => state.onPopulateBadges)
  const badges = useAdminStore((state) => state.badges)
  const toggleEdit = useAdminStore((state) => state.toggleEdit)
  const setRangeEdit = useAdminStore((state) => state.setRangeEdit)

  const lastCheckedId = useRef(null)

  useEffect(() => {
    if (isSuccess) populateBadges(data?.data)
  }, [data, isSuccess])

  const handleCheckChange = useCallback((empseriesid, isShift) => {
    if (isShift && lastCheckedId.current) {
      // Determine value from the current item's CURRENT state (we're toggling, use opposite)
      const current = badges.find((b) => b.empseriesid === empseriesid)
      setRangeEdit(lastCheckedId.current, empseriesid, !current?.isEdit)
    } else {
      toggleEdit(empseriesid)
    }
    lastCheckedId.current = empseriesid
  }, [badges, toggleEdit, setRangeEdit])

  if (isLoading) return <Center><Loader /></Center>
  if (isError) {
    const errorMessage = error.response?.data?.errorMessage ?? error.message
    return <ErrorElement>{errorMessage}</ErrorElement>
  }

  return (
    <Paper shadow="none" radius="lg">
      <Table withColumnBorders withRowBorders withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={15}>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th w="20%">Badge Number</Table.Th>
            <Table.Th w={2}>Edit</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {badges.map((item, index) => (
            <AdminRow
              key={`${item.empseriesid}-${index}`}
              item={item}
              onCheckChange={handleCheckChange}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  )
})

const AdminPage = () => {
  const { username } = useParams();
  const [phase, setPhase] = useState()
  const [isLoading, setIsLoading] = useState(false);
  const badges = useAdminStore(state => state.badges);
  const badgeMutation = useUpdateBadgeNumberAdminMutation();


  const handleSavedEdit = () => {
    let updatedItems = badges.filter((item) => item.isEdit);
    updatedItems = updatedItems.map((item) => ({
      ...item,
      phase: phase,
    }))

    const request = {
      username: username,
      data: updatedItems
    } 

    setIsLoading(true);
    badgeMutation.mutate(request, {
      onSuccess: (response) => {
        setIsLoading(false)
        notifications.show({
          color: 'green',
          title: "Update Successfully!",
          message: "Admin's badge number updated!"
        })
      },
      onError: (error) => {
        setIsLoading(false);
        const errorMessage = error.response.data?.errorMessage ?? error.message;
        notifications.show({
          color: 'red',
          title: "Failed to update",
          message: errorMessage
        })

      }
    })


  }

  return (
    <AppShell>
      <AppShell.Main>
        <Container h="100%">
          <Space h={50} />
          <Group gap={0} justify="space-between">
            <Stack gap={0}>
              <Text tt="uppercase" size="lg" fw={600}>Admin Workers</Text>
              <Text>List of admins</Text>
            </Stack>
          </Group>
          <Box w={{ sm: "60%", base: "100%" }}>
            <SelectPhase params={username}  onChange={setPhase} />
          </Box>
          <Group justify="flex-end">
            <Button variant="outline">VIEW DTR</Button>
            <Button loading={isLoading} onClick={handleSavedEdit}  variant="light">SAVED</Button>
          </Group>
          <Space h={20} />
          <Text ta="right" size="xs" c="dimmed">Checked Multiple rows by Shift + Click </Text>
          <AdminList params={{ username: username, phaseCode: phase}} />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default AdminPage
