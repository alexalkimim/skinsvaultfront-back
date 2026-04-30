import NextAuth, { AuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Adapter } from "next-auth/adapters";
import { compare } from "bcryptjs";

// 1. Configuração do Banco de Dados com logs de conexão
console.log("[DB_INIT] Inicializando Pool de conexão com Postgres...");
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 
});

pool.on('error', (err) => {
  console.error("[DB_POOL_ERROR] Erro fatal no pool de conexão:", err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 2. Extensão de Tipos do NextAuth
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      plan: string;
      telefone: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    plan: string;
    telefone: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    plan: string;
    telefone: string | null;
  }
}

// 3. Opções de Autenticação
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null;
        }

        const t0 = performance.now();
        console.log(`[AUTH_PERF] Iniciando autorização para: ${credentials.email}`);

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          const t1 = performance.now();
          console.log(`[AUTH_PERF] Busca no banco concluída em ${(t1 - t0).toFixed(2)}ms`);

          // Cast seguro e estrito para TypeScript, mesclando o tipo original com os campos de senha
          const dbUser = user as typeof user & { 
            password?: string | null; 
            senha?: string | null; 
          };

          const hashSenha = dbUser?.password || dbUser?.senha;

          if (!dbUser || !hashSenha) {
            console.log("[NEXTAUTH_AUTHORIZE] Usuário não encontrado ou sem senha cadastrada.");
            return null;
          }

          const senhaValida = await compare(credentials.senha, hashSenha);

          const t2 = performance.now();
          console.log(`[AUTH_PERF] Validação de hash (bcrypt) concluída em ${(t2 - t1).toFixed(2)}ms`);

          if (senhaValida) {
            console.log("[NEXTAUTH_AUTHORIZE] Login aprovado. ID:", dbUser.id);
            return {
              id: dbUser.id,
              email: dbUser.email,
              plan: dbUser.plan || "basico",
              telefone: dbUser.telefone || null,
            };
          }
          
          return null;
        } catch (error) {
          const tErro = performance.now();
          console.error(`[AUTH_PERF_ERROR] Falha de comunicação com o banco após ${(tErro - t0).toFixed(2)}ms`);
          console.error("[NEXTAUTH_AUTHORIZE_ERROR] Detalhes:", error);
          return null;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.plan = user.plan || "basico";
        token.telefone = user.telefone || null;
      }
      
      if (trigger === "update" && session?.telefone) {
        token.telefone = session.telefone;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.plan = token.plan;
        session.user.telefone = token.telefone;
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };