import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Ciclos() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to consolidated Auditorias page
    navigate('/auditor/minhas-auditorias', { replace: true });
  }, [navigate]);

  return null;
}
