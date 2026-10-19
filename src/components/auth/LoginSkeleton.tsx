'use client';

import Login from './Login';
import Box from '@mui/material/Box';

export default function LoginSkeleton({
  configured,
  googleEnabled,
}: {
  configured: boolean;
  googleEnabled: boolean;
}) {
  return (
    <Box data-ui="login-skeleton">
      <Login configured={configured} googleEnabled={googleEnabled} loading />
    </Box>
  );
}
