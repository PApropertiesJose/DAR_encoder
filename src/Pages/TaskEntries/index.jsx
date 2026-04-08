import {
  Container,
  Text,
  Breadcrumbs,
  Anchor,
  Stack,
  Divider,
  Group,
} from "@mantine/core";
import { Link, useParams } from 'react-router'
import StringRoutes from "~/Constants/StringRoutes";
import { ChevronRight } from "lucide-react";
import TaskFieldForms from "./Components/TaskFieldForms";
import TaskList from "./Components/TaskList";
import TaskProvider, { useTaskContext } from "./context";


const TaskEntries = () => {
  const items = [
    { title: "Phase", href: StringRoutes.project_selection },
    { title: "Task Entries", href: null }
  ].map((item, index) => (
    <Anchor
      key={index}
      size="xs"
      component={Link}
      to={item.href || '#'}
      c={item.href ? 'var(--accent)' : 'dimmed'}
      viewTransition
      style={{ fontFamily: 'monospace', viewTransitionName: item.title }}
    >
      {item.title}
    </Anchor>
  ));


  return (
    <TaskProvider>
      <Container fluid p={0}>
        <Stack gap={0} pb={10} m={0}>
          <Group gap={10}>
            <Text size="xl" fw={500}>Task Entries</Text>
          </Group>
          <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin={3}>
            {items}
          </Breadcrumbs>
        </Stack>
        <Divider />
        <TaskFieldForms />
        <TaskList />
      </Container>
    </TaskProvider>
  );
}

export default TaskEntries;
