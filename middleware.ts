import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Se não estiver logado, o withAuth já joga para o login automaticamente
    if (!token) return NextResponse.next();

    const isPublicPage = pathname === "/onboarding" || 
                         pathname === "/login" || 
                         pathname.startsWith("/api/auth") ||
                         pathname.startsWith("/_next") ||
                         pathname === "/favicon.ico";

    // LÓGICA DE BLOQUEIO:
    // Se o cara está logado, NÃO tem telefone e tenta acessar algo que não seja onboarding/login...
    if (!token.telefone && !isPublicPage) {
      console.log("🚫 Bloqueado pelo Middleware: Sem telefone.");
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Garante que o middleware só rode se houver um token (usuário logado)
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/perfil", "/entrada", "/dashboard", "/cotador"],
};