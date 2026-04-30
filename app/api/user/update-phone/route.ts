import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Criamos a conexão com o banco
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 2. Definimos um tipo para evitar o uso de 'any' e satisfazer o ESLint
interface PrismaWithUser {
  user: {
    update: (args: { where: { email: string }; data: { telefone: string } }) => Promise<unknown>;
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { telefone } = await req.json();
    // Adicione isso logo antes do try {} no seu arquivo route.ts
    console.log("Tentando atualizar telefone para o email:", session.user.email);
  try {
    // 3. Fazemos o cast para a interface que criamos, eliminando o erro de "Property user does not exist"
    const prismaExtended = prisma as unknown as PrismaWithUser;
    
    await prismaExtended.user.update({
      where: { email: session.user.email },
      data: { telefone },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro na atualização do telefone:", err);
    return NextResponse.json({ error: "Erro ao atualizar o cadastro" }, { status: 500 });
  }
}