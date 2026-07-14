import { Container, Anchor, Stack, Breadcrumbs, Text, Title, Flex, ThemeIcon, Divider } from '@mantine/core'
import { Link } from 'react-router'
import { Files, ChevronRight } from 'lucide-react'

const ManualDAR = () => {
  const items = [
    {
      title: "Download", href: null,
    }
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
  ))

  return (
    <Container fluid p={0}>
      <Flex direct="row" pb={10}>
        <ThemeIcon variant="light" c="teal" size={42}>
          <Files />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={5} fw={700}>Manual DAR</Title>
          <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin="xs">
            {items}
          </Breadcrumbs>
        </Stack>
      </Flex>
      <Divider />
    </Container>
  );
}

export default ManualDAR;
