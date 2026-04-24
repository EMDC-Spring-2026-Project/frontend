import { Box, Container, Typography, Paper } from "@mui/material";
import image from "../assets/group.webp";
import { useEffect, useRef } from "react";

// Preload the hero image for faster loading
const preloadLink = document.createElement("link");
preloadLink.rel = "preload";
preloadLink.as = "image";
preloadLink.href = image;
preloadLink.fetchPriority = "high";
document.head.appendChild(preloadLink);

export default function Home() {

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.setAttribute("fetchpriority", "high");
    }
  }, []);

  return (
    <Box sx={{ bgcolor: "#fafafa", minHeight: "100vh" }}>
      {/* Hero Image Section */}
      <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2 }, pt: 1 }}>
        <Box
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
            width: "100%",
            maxHeight: "400px",
            aspectRatio: "16 / 9",
            position: "relative",
          }}
        >
          <img
            ref={imgRef}
            src={image}
            alt="Engineering Machine Design Contest Hero Image"
            width={1200}
            height={800}
            loading="eager"
            decoding="async"
            style={{
              display: "block",
              width: "calc(100% + 2px)",
              height: "100%",
              objectFit: "cover",
              objectPosition: "left 10%",
              marginLeft: "-1px",
              filter: "grayscale(100%)",
            }}
          />
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        {/* Welcome Section */}
        <Paper
          elevation={0}
          sx={{
            mt: { xs: -8, sm: -12, md: -16 },
            position: "relative",
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 3,
            bgcolor: "white",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.5rem" },
              lineHeight: 1.3,
              mb: 2.5,
              fontFamily: '"DM Serif Display", "Georgia", serif',
              fontWeight: 400,
              letterSpacing: "0.01em",
              color: "#1a1a1a",
            }}
          >
            Welcome to the Engineering Machine Design Contest (EMDC) Tabulation
            System!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: "1rem", sm: "1.1rem" },
              lineHeight: 1.7,
              color: "#4a4a4a",
              maxWidth: "800px",
            }}
          >
            We're excited to have you on board. Your role is crucial in
            recognizing the creativity, teamwork, and engineering skills
            demonstrated by our student teams.
          </Typography>
        </Paper>

        {/* Contest Overview Section */}
        <Box sx={{ mt: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              borderRadius: 3,
              bgcolor: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                bgcolor: "#f0f0f0",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "#666",
                }}
              >
                ABOUT THE CONTEST
              </Typography>
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                mb: 3,
                fontFamily: '"DM Serif Display", "Georgia", serif',
                fontWeight: 400,
                letterSpacing: "0.01em",
                lineHeight: 1.3,
                color: "#1a1a1a",
              }}
            >
              Contest Overview
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                lineHeight: 1.8,
                color: "#4a4a4a",
              }}
            >
              The Engineering Machine Design Contest (EMDC) is an engaging,
              hands-on competition that challenges teams of 5th-12th grade
              students to design and build complex chain-reaction machines. Each
              machine must incorporate a specific contest theme while applying
              principles of science, technology, engineering, and mathematics
              (STEM). Teams work collaboratively to solve engineering challenges
              using recycled materials, innovative ideas, and advanced
              components like mechanical systems, electrical circuits, chemical
              reactions, and more. The competition encourages creativity,
              resourcefulness, and problem-solving while giving students an
              opportunity to showcase their skills in a real-world context.
            </Typography>
          </Paper>
        </Box>

        {/* Contest Objectives Section */}
        <Box sx={{ mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              borderRadius: 3,
              bgcolor: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                bgcolor: "#f0f0f0",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "#666",
                }}
              >
                OUR MISSION
              </Typography>
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                mb: 3,
                fontFamily: '"DM Serif Display", "Georgia", serif',
                fontWeight: 400,
                letterSpacing: "0.01em",
                lineHeight: 1.3,
                color: "#1a1a1a",
              }}
            >
              Contest Objectives
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                {
                  number: "01",
                  title: "Provide an Accessible Learning Experience",
                  description:
                    "Offer a low-cost, affordable opportunity for students from underserved and rural communities to engage in hands-on STEM learning.",
                },
                {
                  number: "02",
                  title: "Inspire Career Pathways",
                  description:
                    "Spark interest in engineering and related career fields by giving students real-world challenges that align with their future career aspirations.",
                },
                {
                  number: "03",
                  title: "Equip Students with Career-Ready Skills",
                  description:
                    "Develop critical thinking, teamwork, and problem-solving skills that will prepare students for success in future careers.",
                },
              ].map((objective) => (
                <Box
                  key={objective.number}
                  sx={{
                    display: "flex",
                    gap: 2.5,
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "2.5rem",
                      fontWeight: 700,
                      color: "#e0e0e0",
                      lineHeight: 1,
                      minWidth: "60px",
                      fontFamily: '"DM Serif Display", "Georgia", serif',
                    }}
                  >
                    {objective.number}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 600,
                        mb: 0.5,
                        color: "#1a1a1a",
                      }}
                    >
                      {objective.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "0.95rem", sm: "1.05rem" },
                        lineHeight: 1.7,
                        color: "#4a4a4a",
                      }}
                    >
                      {objective.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}