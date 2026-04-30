import Link from 'next/link';

export default function RecuperarSenha() {
    return (
        <main className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-8 rounded-[2rem]">
                <h2 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h2>
                <p className="text-zinc-400 text-sm mb-6">Digite seu e-mail para receber as instruções.</p>
                
                <input
                    type="email"
                    placeholder="Digite seu e-mail"
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-purple-500 transition-all"
                />

                <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl mt-4 transition-colors">
                    ENVIAR CÓDIGO
                </button>

                <div className="flex justify-center mt-6">
                    <Link 
                        href="/login" 
                        className="text-emerald-500 text-sm font-medium hover:underline transition-all"
                    >
                        Voltar para o login
                    </Link>
                </div>
            </div>
        </main>
    );
}