import {
  Container,
  AppShell,
  Burger,
  Paper,
  Group,
  ScrollArea,
  Space,
  Text,
  Menu,
  Box,
  Badge,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useElementSize, useHeadroom } from '@mantine/hooks';
import { NavLink, useLocation, Outlet, useNavigate, useNavigationType } from 'react-router';
import '../index.css';
import useAuth from '~/hooks/Auth/useAuth';
import { useEffect, useRef, useState } from 'react';
import packageJson from '../../package.json';
import './index.css'
import {
  BarChart2,
  ChevronRight,
  History,
  LayoutDashboard,
  LogOut,
  Wrench,
  Sun,
  Moon,
  Bell,
  Settings,
  NotebookPen,
  FileWarning,
  Building2,
  Book,
  MapPin,
} from 'lucide-react';
import StringRoutes from '~/Constants/StringRoutes';

const ToggleMenuTheme = ({
  onClick
}) => {
  const savedTheme = localStorage.getItem('color-scheme') || 'dark';

  if (savedTheme === 'dark') {
    return (
      <Menu.Item onClick={() => onClick('light')} leftSection={<Sun />}>
        Light
      </Menu.Item>
    )
  }

  return (
    <Menu.Item onClick={() => onClick('dark')} leftSection={<Moon />}>
      Dark
    </Menu.Item>
  )
}
/* ─── Sub-components ─── */

const NavSection = ({ label, icon: Icon, children, routes = [] }) => {
  const location = useLocation();
  const isAnyChildActive = routes.some(r => location.pathname.startsWith(r));
  const [opened, { toggle }] = useDisclosure(isAnyChildActive);

  return (
    <Box>
      <div
        className={`nav-group-row${isAnyChildActive ? ' active' : ''}`}
        onClick={toggle}
      >
        <div className="nav-group-icon">
          <Icon size={15} />
        </div>
        <span className="nav-group-label">{label}</span>
        <ChevronRight size={14} className={`nav-chevron${opened ? ' open' : ''}`} />
      </div>
      {opened && (
        <div className="nav-children">
          {children}
        </div>
      )}
    </Box>
  );
};

const ChildLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <NavLink to={to} className={`nav-child-link${isActive ? ' active' : ''}`}>
      {Icon && <Icon size={13} />}
      {children}
    </NavLink>
  );
};

const NotificationDot = () => (
  <span style={{
    width: 7, height: 7,
    borderRadius: '50%',
    background: '#f0a500',
    boxShadow: '0 0 6px rgba(240,165,0,0.6)',
    display: 'inline-block',
    position: 'absolute',
    top: 7, right: 7,
  }} />
);

const ButtonNavLink = ({
  to = null,
  children,
}) => {
  const { user } = useAuth();
  return (
    <NavLink to={to}>{children}</NavLink>
  )
}

const DashboardLayout = () => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const pinned = useHeadroom({ fixedAt: 120 })
  const {onSetClearToken } = useAuth();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const scrollPositions = useRef({});
  const location = useLocation();
  const { user } = useAuth();
  const username = user?.username;
  const { ref, height } = useElementSize();
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('color-scheme') || 'dark') === 'dark'
  );

  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.current[location.pathname] = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (navigationType === 'POP') return;
    const saved = scrollPositions.current[location.pathname];
    if (saved !== undefined) {
      setTimeout(() => window.scrollTo(0, saved), 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navigationType]);

  const toggleTheme = () => {
    const current = localStorage.getItem('color-scheme') || 'light';
    const nextTheme = current === 'dark' ? 'light' : 'dark';

    // Update persistence and DOM
    localStorage.setItem('color-scheme', nextTheme);
    document.documentElement.setAttribute('data-mantine-color-scheme', nextTheme);

    // Notify the App component to swap the theme object
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleLogout = () => onSetClearToken();

  const initials = user?.name 
    ? user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <AppShell
      header={{ height: 58, offset: true }}
      navbar={{
        width: 248,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="lg"
    >
      {/* ── Header ── */}
      <AppShell.Header className="custom-header">
        <Group h="100%" px="md" justify="space-between">
          {/* Left: burger + brand */}
          <Group gap="sm">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color="#6b7280"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
              color="#6b7280"
            />
            <div className="brand-mark">
              <div className="brand-icon">
                <Building2 size={16} color="white" strokeWidth={2.5} />
              </div>
              <Text c="dimmed" size="sm">
                {packageJson.name}
              </Text>
              <Badge variant='light'>
                <Text size={12} fw={400}>{packageJson.version}</Text>
              </Badge>
            </div>
          </Group>

          {/* Right: actions */}
          <Group gap={8}>
            <Tooltip label="Toggle theme" position="bottom">
              <div className="header-action-btn" onClick={toggleTheme}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </div>
            </Tooltip>
            <Tooltip label="Notifications" position="bottom">
              <div className="header-action-btn" style={{ position: 'relative' }}>
                <Bell size={15} />
                <NotificationDot />
              </div>
            </Tooltip>
            <Tooltip label="Settings" position="bottom">
              <div className="header-action-btn">
                <Settings size={15} />
              </div>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Sidebar ── */}
      <AppShell.Navbar>
        <ScrollArea h="calc(100% - 50px)" scrollbarSize={4}>
          <Space h={12} />

          {/* Dashboard */}
          <div className="nav-section-label">Overview</div>
          <ChildLink to={"/"} icon={LayoutDashboard}>
            Dashboard
          </ChildLink>
          <ChildLink to={StringRoutes.project_selection} icon={NotebookPen}>
            Task Entries
          </ChildLink>
          <Space h={16} />
        </ScrollArea>

        {/* ── User Footer ── */}
        <Container p={10} m={0} >

          <Paper radius="none" p={0} m={0} >
            <Menu position="top" width={200} offset={8}>
              <Menu.Target>
                <div className="user-card">
                  <Text c="#f8f9fa" fw={800} className="user-avatar">{initials}</Text>
                  <div>
                    <Text size="xs">{username}</Text>
                    {/* <div className="user-name">{user?.user?.name || 'Admin'}</div> */}
                    <div className="user-role">{user?.role}</div>
                  </div>
                  <ChevronRight size={14} className="user-chevron" />
                </div>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<History size={14} />}>View History</Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<LogOut size={14} />} onClick={handleLogout} color="red">
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Paper>
        </Container>
      </AppShell.Navbar>

      {/* ── Main ── */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default DashboardLayout;
