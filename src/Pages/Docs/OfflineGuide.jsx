import { Container, Anchor, Breadcrumbs, Stack, Text, Divider, Paper, Typography, Space } from '@mantine/core';
import { memo, useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import guideSource from '../../../docs/Offline-Mode-User-Guide.md?raw';

// Resolve the guide's relative image paths (images/xx.svg) to bundled asset URLs
const imageUrls = import.meta.glob('../../../docs/images/*', { eager: true, query: '?url', import: 'default' });

const resolveImage = (src) => {
  const name = src?.split('/').pop();
  const match = Object.entries(imageUrls).find(([path]) => path.endsWith(`/${name}`));
  return match ? match[1] : src;
};

const OfflineGuide = memo(() => {
  const items = [{ title: 'Offline Mode Guide', href: null }].map((item, index) => (
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

  // The mermaid fence is for GitHub rendering — swap it for a plain-text flow in-app
  const source = useMemo(
    () =>
      guideSource.replace(
        /```mermaid[\s\S]*?```/,
        '> 🌐 **Sync reference data** (online) → 📴 **Encode task sheet** (offline) → 🌐 **Validate & sync** (online) — with optional Excel export any time.'
      ),
    []
  );

  return (
    <Container fluid p={0} m={0}>
      <Stack gap={0} pb={10} m={0}>
        <Text size="xl" fw={500}>
          User Guide
        </Text>
        <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin="xs">
          {items}
        </Breadcrumbs>
      </Stack>
      <Divider />
      <Space h={10} />
      <Paper shadow="sm" radius="lg" p={{ md: 'xl', base: 'md' }} mdw={"100%"} mx="auto">
        <Typography>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={resolveImage(src)}
                  alt={alt}
                  style={{
                    maxWidth: '100%',
                    borderRadius: 8,
                    border: '1px solid var(--mantine-color-default-border)',
                    margin: '8px 0',
                  }}
                />
              ),
            }}
          >
            {source}
          </ReactMarkdown>
        </Typography>
      </Paper>
    </Container>
  );
});

export default OfflineGuide;
