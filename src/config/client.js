import axios from 'axios';
import useAuth from '~/hooks/Auth/useAuth';

const client = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default client;


