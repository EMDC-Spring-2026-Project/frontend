
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
import theme from "../theme";
import { useAuthStore } from "../store/primary_stores/authStore";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { login, isLoadingAuth, authError, role, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = new URLSearchParams(location.search).get("reason") === "session-expired";

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
      <Button variant="contained" onClick={() => navigate("/")} sx={{ m: 1 }}>
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
            label="Email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 5, width: 300 }}
          />
          <FormControl required sx={{ mt: 3, width: 300 }} variant="outlined">
            <InputLabel>Password</InputLabel>
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
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
            <Typography variant="body2">Forgot Password?</Typography>
          </Link>
          <Button
            type="submit"
            disabled={isLoadingAuth}
            sx={{
              width: 120,
              height: 35,
              bgcolor: `${theme.palette.primary.main}`,
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
          {sessionExpired && authError == null && (
            <Alert sx={{ mt: 3 }} severity="warning">
              Your session expired. Please log in again to continue.
            </Alert>
          )}
        </form>
      </Container>
    </>
  );
}
