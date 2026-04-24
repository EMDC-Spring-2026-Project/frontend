import {
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import TriangleBackground from "../components/TriangleBackground";
import { useState } from "react";
import theme from "../theme";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/**
 * ForgotPassword Component
 * 
 * Page for users to request password reset links.
 * Features:
 * - Email validation
 * - Only available for administrators (role 1) and coaches (role 4)
 * - Connects to backend API: /api/auth/forgot-password/
 * - Sends password reset email via Resend service
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Handles form submission to request password reset
   * Validates email format and sends request to backend API
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email is provided
    if (!email) {
      setError("Email is required.");
      return;
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      // Send password reset request to backend API
      const response = await api.post(
        `/api/auth/forgot-password/`,
        { username: email }
      );

      //Backend may return error in 200 response for non-admin/coach users
      if (response.data?.error) {
        // Show error toast for non-admin/coach users
        setError(response.data.detail || response.data.error);
      } else {
        //Success - admin/coach email sent
        toast.success(
          "If this email belongs to an admin or coach, a password reset link has been sent.\n\n You will be redirected to the login page.\n\n For organizer and judge resets please contant an Administrator.",
          {
            duration: 8000,
          }
        );
        // Clear form
        setEmail("");
        // Optionally navigate back to login after a delay
        setTimeout(() => {
          navigate("/login/");
        }, 8000);
      }
    } catch (err: any) {
      // Extract error message from backend response
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (err?.response?.data) {
        // Backend returned structured error data
        errorMessage = err.response.data.detail || err.response.data.error || errorMessage;
      } else if (err?.response?.status) {
        // HTTP error without detailed message
        if (err.response.status === 500) {
          errorMessage = "Server error occurred. Please check your email configuration or contact support.";
        } else if (err.response.status === 403) {
          errorMessage = "Password reset is only available for administrators and coaches. Please contact an administrator for assistance.";
        }
      } else if (err?.message && !err.message.includes("status code")) {
        // Only use err.message if it's not the generic axios error
        errorMessage = err.message;
      }

      if (err?.response?.status === 403) {
        // Non-admin/coach user - show toast
        toast.error(
          "Password reset is only available for administrators and coaches. Please contact an administrator for assistance.",
          {
            duration: 6000,
            style: {
              maxWidth: "500px",
            },
          }
        );
      } else if (err?.response?.status === 500) {
        // Server error - show user-friendly message
        toast.error(
          errorMessage,
          {
            duration: 6000,
            style: {
              maxWidth: "500px",
            },
          }
        );
      } else {
        toast.error(errorMessage, {
          duration: 5000,
        });
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TriangleBackground />
      <Button
        variant="contained"
        onClick={() => navigate("/login/")}
        sx={{ m: 1 }}
      >
        Back To Login
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
        <Typography variant="h1">Forgot Password</Typography>
        <Typography
          variant="body2"
          sx={{ mt: 2, mb: 1, color: "text.secondary", textAlign: "center" }}
        >
          Enter your email address to receive a password reset link.
          <br />
          <strong>Note: Password reset is only available for administrators and coaches.</strong>
        </Typography>
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <TextField
            required
            label="Email"
            variant="outlined"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{ mt: 3, width: 300 }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, width: 300 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading || !email}
            sx={{
              width: 150,
              height: 40,
              bgcolor: `${theme.palette.primary.main}`,
              color: `${theme.palette.secondary.main}`,
              mt: 4,
              "&:disabled": {
                bgcolor: theme.palette.grey[300],
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </Container>
    </>
  );
}
