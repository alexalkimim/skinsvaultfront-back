import axios from "axios";

// ====================================
// CONFIG
// ====================================

const API_KEY = "AUPR1LPO9RL9FWXM";

const TRADE_LINK =
  "https://steamcommunity.com/tradeoffer/new/?partner=1217261641&token=sxUXB_vk";

// ====================================
// HELPERS
// ====================================

function extractSteamIdFromTradeLink(tradeLink) {
  const match = tradeLink.match(/partner=(\d+)/);

  if (!match) {
    throw new Error("Trade link inválido");
  }

  const accountId = BigInt(match[1]);

  return (accountId + 76561197960265728n).toString();
}

function isGlove(name) {
  const lower = name.toLowerCase();

  return (
    lower.includes("gloves") ||
    lower.includes("hand wraps") ||
    lower.includes("driver gloves") ||
    lower.includes("sport gloves") ||
    lower.includes("specialist gloves") ||
    lower.includes("moto gloves") ||
    lower.includes("hydra gloves") ||
    lower.includes("broken fang gloves")
  );
}

// ====================================
// MAIN
// ====================================

async function main() {
  try {
    const steamid = extractSteamIdFromTradeLink(TRADE_LINK);

    console.log("SteamID:", steamid);

    // ============================
    // 1. PEGAR INVENTÁRIO
    // ============================

    const inventoryUrl =
      `https://www.steamwebapi.com/steam/api/inventory` +
      `?key=${API_KEY}` +
      `&steam_id=${steamid}` +
      `&game=cs2`;

    const inventoryResponse = await axios.get(inventoryUrl);

    const items = inventoryResponse.data;

    const gloves = items.filter((item) =>
      isGlove(item.markethashname || "")
    );

    if (gloves.length === 0) {
      console.log("Nenhuma luva encontrada.");
      return;
    }

    console.log("\n===== LUVAS =====\n");

    // ============================
    // 2. PEGAR PREÇO INDIVIDUAL
    // ============================

    for (const glove of gloves) {
      console.log("Item:", glove.markethashname);

      const itemUrl =
        `https://www.steamwebapi.com/steam/api/items` +
        `?key=${API_KEY}` +
        `&game=cs2` +
        `&markets=buff,youpin` +
        `&search=${encodeURIComponent(glove.markethashname)}`;

      const itemResponse = await axios.get(itemUrl);

      const result = itemResponse.data?.[0];

      if (!result) {
        console.log("Item não encontrado.");
        console.log("-------------------------");
        continue;
      }

      console.log("\nSteam:");
      console.log(result.pricelatest);

      console.log("\nMarketplaces:");

      if (Array.isArray(result.prices)) {
        for (const market of result.prices) {
          console.log(
            `${market.market.toUpperCase()}: ${market.price}`
          );
        }
      } else {
        console.log("Seu plano/API não retornou prices[]");
      }

      console.log("\n-------------------------\n");
    }
  } catch (error) {
    if (error.response) {
      console.log("Erro API:", error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

main();