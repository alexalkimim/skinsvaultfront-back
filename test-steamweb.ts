import axios from 'axios';

// --- SUA MUNIÇÃO ---
const API_KEY = "N78IRH6TD7DS1JSF"; 
const TRADE_LINK = "https://steamcommunity.com/tradeoffer/new/?partner=1217261641&token=sxUXB_vk";

const rodarTeste = async (): Promise<void> => {
    console.log(`\n==================================================`);
    console.log(`[TESTE RAW STEAMWEBAPI] Raios-X da Luva...`);
    
    try {
        const res = await axios.get('https://www.steamwebapi.com/steam/api/inventory', {
            params: {
                key: API_KEY,
                trade_url: TRADE_LINK, 
                game: 'cs2',
                parse: '1', 
                markets: 'buff', // Tiramos Youpin para não dar conflito técnico[cite: 1]
                with_prices: '1', // Forçamos o array de preços[cite: 1]
                currency: 'CNY',
                try_first_seven_days_blocked_items: '1' 
            },
            timeout: 30000 
        });

        const items = Array.isArray(res.data) ? res.data : [];
        const targetItem = items.find((i: any) => (i.markethashname || "").includes("Imperial Plaid"));

        if (!targetItem) {
            console.log(`\n[FALHA] A luva não foi encontrada.`);
            return;
        }

        console.log(`\n================ JSON CRU DA LUVA ================`);
        console.log(JSON.stringify(targetItem, null, 2));
        console.log(`==================================================\n`);

    } catch (err: unknown) {
        console.log(`\n==================================================`);
        console.log(`[FALHA NO DISPARO]`);
        if (axios.isAxiosError(err) && err.response) {
            console.log(`Status HTTP: ${err.response.status}`);
            console.log(`Detalhes:`, err.response.data);
        } else {
            console.log(`Motivo: ${err instanceof Error ? err.message : 'Erro'}`);
        }
        console.log(`==================================================\n`);
    }
};

rodarTeste();