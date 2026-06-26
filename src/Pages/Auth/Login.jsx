import {
  Container,
  Button,
  Text,
  Title,
  Group,
  Flex,
  TextInput,
  Space,
  Checkbox,
  Divider,
  Image,
  Paper,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { HomeIcon, LockIcon, Mail, PhoneCall, Download } from "lucide-react";
import useLoginMutation from "~/hooks/Auth/useLoginMutation";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import useAuth from "~/hooks/Auth/useAuth";
import { useNavigate } from "react-router";
import StringRoutes from "~/constants/StringRoutes";
import packageJson from '../../../package.json';
import { usePWAInstall } from "~/hooks/usePWAInstall";
// import Logo from '~/assets/DefaultImages/PaLogoCol.png';


const formWidth = {
  sm: '100%',
  md: 500,
}

const InstallBanner = () => {
  const { canInstall, install } = usePWAInstall();
  if (!canInstall) return null;

  return (
    <Paper withBorder p="sm" mb="lg" radius="md" style={{ width: '100%', maxWidth: 500, background: 'var(--mantine-color-blue-0)' }}>
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" fw={600}>Install DAR Encoder</Text>
          <Text size="xs" c="dimmed">Add to your home screen for offline access</Text>
        </div>
        <Button size="xs" leftSection={<Download size={14} />} onClick={install}>
          Install
        </Button>
      </Group>
    </Paper>
  );
};

const Login = () => {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
    validate: {
      username: (value) => (value.length < 0 ? 'Required input' : null),
      password: (value) => (value.length < 0 ? 'Required input' : null),
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const loginMutation = useLoginMutation();
  const { onSetUserDetails } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = form.validate();

    if (valid) onManageLogin();
  }

  const onManageLogin = () => {
    setIsLoading(true);
    loginMutation.mutate(form.getValues(), {
      onSuccess: (response) => {
        if(!response.data?.status) {
          setIsLoading(false);
          notifications.show({
            color: 'red',
            title: "Failed Login Attempt",
            message: response?.data.errorMessage 
          })
          return;
        }

        console.log(response.data.data);
        setIsLoading(false);

        onSetUserDetails(response.data.data, null)
        notifications.show({
          color: 'green',
          title: "Success",
          message: "Please wait to redirect you to the dashboard"
        });

        setTimeout(() => {
          navigate(StringRoutes.dashboard);
        }, 1000)
      },
      onError: (error) => {
        setIsLoading(false);
        const errorMessage = error.response?.data?.message || error.message;
        notifications.show({
          color: 'red',
          title: "Failed Login Attempt",
          message: errorMessage
        })
      }
    })
  }

  return (
    <Container bg="white" h={'100vh'} fluid >
      <Flex direction={"column"} h={"100%"} align="center" justify="center">
        {/* <Image src={Logo} h={120} w="auto" /> */}

        <InstallBanner />
        <form onSubmit={handleSubmit}>
          <Flex direction="column" align="center" >
            {/* <Group justify="center" align="center"> */}
            {/*   <HomeIcon /> */}
            {/*   <Title fw={500}>{packageJson.name}</Title> */}
            {/* </Group> */}
            <Title style={{ textAlign: 'center' }} size={50} fw={800}>Welcome Back</Title>
            <Text style={{ textAlign: 'center' }}>Sign in using your account.</Text>
            <Space h="lg" />
            <TextInput
              withAsterisk
              size="lg"
              leftSection={<Mail />}
              label="Username"
              placeholder="Enter your username"
              key={form.key('username')}
              {...form.getInputProps('username')}
              w={formWidth} />

            <Space h="lg" />
            <TextInput
              type="password"
              withAsterisk
              label="Password"
              placeholder="Enter your password"
              size="lg"
              key={form.key('password')}
              {...form.getInputProps('password')}
              leftSection={<LockIcon />}
              w={formWidth} />

            <Space h="lg" />
            <Group w={formWidth} justify="start">
              <Checkbox
                key={form.key('rememberMe')}
                {...form.getInputProps('rememberMe')}
                label="Remember Me" />
            </Group>

            <Button
              loading={isLoading}
              type="submit"
              fullWidth w={formWidth} mt={20} size="lg" radius="md" >
              Login
            </Button>

            <Divider my="md" label={<Text>Don't have an account?</Text>} labelPosition="center" />

            <Button
              fullWidth leftSection={<PhoneCall />} w={formWidth} variant="outline" mt={20} size="lg" radius="md" >
              Request Access to IT
            </Button>


          </Flex>
        </form>
      </Flex>
    </Container>
  )
}


export default Login;

