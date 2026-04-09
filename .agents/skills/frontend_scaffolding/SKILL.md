---
name: Frontend Scaffolding
description: Instructions and standards for developing React components, pages, and state management in the DAR Encoder project.
---

# Frontend Scaffolding Skill

This skill provides the architectural guidelines and boilerplate patterns for the DAR Encoder frontend.

## Core Technology Stack
- **Framework**: React (Functional Components + Hooks)
- **UI Library**: Mantine v8
- **State Management**: Zustand
- **Icons**: Lucide React
- **Icons Routing**: React Router
- **Data Fetching**: TanStack Query + Axios

## Key Guidelines

### 1. Component Structure
- Folders should be `PascalCase`.
- Main entry point for a component or page should be `index.jsx`.
- Local components go into a `components/` subdirectory within the feature folder.

### 2. Styling (Mantine & CSS)
- Always prefer Mantine components over raw HTML.
- Use the custom theme variables defined in `src/theme.ts`.
- Reference colors using CSS variables like `var(--primary)`, `var(--shell-bg)`, `var(--nav-bg)`.

### 3. State Management (Zustand)
- Create a store for each major feature in `src/hooks/` or within the feature folder if localized.
- Use the `create` function from `zustand`.

### 4. Import Aliases
- Use `~/` to refer to the `src/` directory.
  - Example: `import { ... } from '~/components/Map'`

## Templates

### Standard Page/Component (`index.jsx`)
```jsx
import { Container, Title, Paper, Stack } from '@mantine/core';
import { LucideIcon } from 'lucide-react'; // Example

const MyComponent = () => {
  return (
    <Container fluid p="md">
      <Paper p="xl" radius="md" withBorder>
        <Stack>
          <Title order={2}>Feature Title</Title>
          {/* Content goes here */}
        </Stack>
      </Paper>
    </Container>
  );
};

export default MyComponent;
```

### Zustand Store (`useStore.js`)
```javascript
import { create } from 'zustand';

export const useStore = create((set) => ({
  data: [],
  loading: false,
  setData: (newData) => set({ data: newData }),
  setLoading: (status) => set({ loading: status }),
}));
```
