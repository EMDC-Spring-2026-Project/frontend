
import {
  Button,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
  Link,
  Alert,
} from "@mui/material";
import TriangleBackground from "../components/TriangleBackground";
import { useEffect, useState } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import theme, { ACCESSIBLE_GREEN } from "../theme";
import { useAuthStore } from "../store/primary_stores/authStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SESSION_EXPIRED_REASON } from "../lib/sessionExpiry";

export default function Login() {
  const { login, isLoadingAuth, authError, role, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === SESSION_EXPIRED_REASON;

  // Redirect after successful login based on role
  useEffect(() => {
    if (isAuthenticated && role) {
      switch (role.user_type) {
        case 1:
          navigate("/admin/");
          break;
        case 2:
          navigate("/organizer/");
          break;
        case 3:
          navigate(`/judging/${role.user.id}`);
          break;
        case 4:
          navigate("/coach/");
          break;
        default:
          break;
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // no navigate here – we let the useEffect do it
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <>
      <TriangleBackground />
      <Button
        variant="contained"
        onClick={() => navigate("/")}
        sx={{ m: 1, bgcolor: ACCESSIBLE_GREEN }}
      >
        Back To Home
      </Button>
      <Container
        maxWidth="xs"
        sx={{
          height: "auto",
          bgcolor: "#ffffff",
          borderRadius: 5,
          mt: 15,
          boxShadow: 5,
          padding: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            fontFamily: '"DM Serif Display", "Georgia", serif',
            fontWeight: 400,
            letterSpacing: "0.02em",
            lineHeight: 1.2,
          }}
        >
          Login
        </Typography>
        {sessionExpired && authError == null && (
          <Alert severity="warning" sx={{ mt: 3, width: 300 }}>
            Your session expired. Please log in again.
          </Alert>
        )}
        <form
          onSubmit={handleLogin}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <TextField
            required
            id="login-email"
            label="Email"
            autoComplete="username"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 5, width: 300 }}
          />
          <FormControl required sx={{ mt: 3, width: 300 }} variant="outlined">
            <InputLabel htmlFor="login-password">Password</InputLabel>
            <OutlinedInput
              id="login-password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClickShowPassword}
                    edge="end"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Password"
            />
          </FormControl>
          <Link
            href="/forgot-password/"
            sx={{
              marginTop: 1,
              textDecoration: "none",
              marginLeft: "-10.5rem",
            }}
          >
            <Typography variant="body2" sx={{ color: ACCESSIBLE_GREEN }}>
              Forgot Password?
            </Typography>
          </Link>
          <Button
            type="submit"
            disabled={isLoadingAuth}
            sx={{
              width: 120,
              height: 35,
              bgcolor: ACCESSIBLE_GREEN,
              color: `${theme.palette.secondary.main}`,
              mt: 5,
            }}
          >
            {isLoadingAuth ? "Logging in..." : "Login"}
          </Button>
          {authError != null && (
            <Alert sx={{ mt: 3 }} severity="error">
              {authError}
            </Alert>
          )}
        </form>
      </Container>
    </>
  );
}
