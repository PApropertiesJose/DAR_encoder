import {
  Text,
  Paper,
  Badge,
  Group,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Card,
  Skeleton
} from '@mantine/core';
import { ArrowRight, MapPin } from 'lucide-react';

export const ProjectCardSkeleton = () => {
  return (
    <Card
      shadow="none"
      p={20}
      m={0}
      radius="lg"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
      }}
    >
      <Group justify="space-between">
        {/* Simulates the Badge */}
        <Skeleton height={24} width={70} radius="md" />
        
        {/* Simulates the ActionIcon */}
        <Skeleton height={28} width={28} circle />
      </Group>

      {/* Simulates the Project Title Text */}
      <Skeleton height={20} width="75%" mt="md" radius="sm" />

      {/* Simulates the Location Icon + Text Group */}
      <Skeleton height={16} width="40%" mt={8} radius="sm" />
    </Card>
  );
};

const ProjectCard = ({
  data,
  onClick,
}) => {
  return (
    <Card
      shadow="none"
      p={20}
      m={0}
      radius="lg"
      style={{
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        border: '0.5px solid var(--mantine-color-default-border)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = 'var(--mantine-shadow-sm)';
        el.style.borderColor = 'var(--mantine-color-dimmed)';

        const arrow = el.querySelector('.card-arrow');
        if (arrow) arrow.style.transform = 'translateX(3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
        el.style.borderColor = 'var(--mantine-color-default-border)';

        const arrow = el.querySelector('.card-arrow');
        if (arrow) arrow.style.transform = 'translateX(0)';
      }}
    >
      <Group justify='space-between'>
        <Badge
          style={{ border: '0.5px solid var(--mantine-color-dimmed)' }}
          variant='light'
          c="primary.5"
          radius="md"
        >
          {data.code}
        </Badge>
        <Tooltip label="Select Phase">
          <ActionIcon
            onClick={() => onClick(data)}
            className="card-arrow"
            size="md"
            variant='transparent'
            c="dark"
            style={{ transition: 'transform 0.2s ease' }}
          >
            <ArrowRight size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text>{data.description}</Text>
      <Group gap={3}>
        <ThemeIcon size={15} variant='transparent' c="gray">
          <MapPin />
        </ThemeIcon>
        <Text size="sm" style={{ fontFamily: 'monospace' }}>{data.location}</Text>
      </Group>
    </Card>
  );
};

export default ProjectCard
