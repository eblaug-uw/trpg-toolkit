import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

function ProtectedRoute({ children }) {
  const { session, loading } = useSession();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
