import React, { useEffect, useRef } from "react";
import { API_URL } from "../utils/helpers";

const GoogleLogin = ({ onLoginSuccess, onLoginError }) => {
  const googleBtnRef = useRef(null);

  useEffect(() => {
    // Cargar script de Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "691059769882-cr25lrk05acsjs8bnu7a108ec6qnp63f.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(
          googleBtnRef.current,
          { theme: "outline", size: "large", text: "continue_with", shape: "pill" }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await fetch(`${API_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al iniciar sesión con Google");

      // Almacenar token y datos del usuario
      localStorage.setItem("mc_token", data.access_token);
      localStorage.setItem("mc_user", JSON.stringify(data.user));
      
      onLoginSuccess(data);
    } catch (err) {
      console.error("Google Login Error:", err);
      if (onLoginError) onLoginError(err.message);
    }
  };

  return <div ref={googleBtnRef}></div>;
};

export default GoogleLogin;
