import { Html, Head, Body, Container, Text, Button } from "@react-email/components";
import * as React from "react";

export default function LoginCredentials({ username, password }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text><strong>Welcome to MiPhi!</strong></Text>
          <Text>Your login credentials are:</Text>
          <Text><strong>Username:</strong> {username}</Text>
          <Text><strong>Password:</strong> {password}</Text>
          <Button
            href="https://example.com"
            style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
          >
            Login
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
