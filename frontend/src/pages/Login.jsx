import LoginForm from "../components/LoginForm";
import "../style/Login.css";
import TopBar from "../components/TopBar";

function Login() {
  return (
    <div className="login-page">
      <TopBar />
      <main className="login-main">
        <LoginForm />
      </main>
    </div>
  );
}

export default Login;
