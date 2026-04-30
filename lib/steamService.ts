import axios from 'axios';

interface SteamDescription {
  classid: string;
  instanceid?: string;
  name?: string;
  market_hash_name?: string;
  icon_url?: string;
}

interface SteamAsset {
  classid: string;
  instanceid?: string;
  market_hash_name?: string;
  amount?: string;
}

export interface InventoryItem {
  name: string | undefined;
  market_hash_name: string;
  image: string | null;
  amount: number;
}

export async function extractSteamID(input: string, apiKey: string) {
  const trimmed = input.trim();

  if (trimmed.includes('tradeoffer/new')) {
    try {
      const { data } = await axios.get('https://csinventoryapi.com/api/v2/steam/tradeurl', {
        timeout: 10000,
        params: { api_key: apiKey, url: trimmed },
      });
      if (data?.steamid64) return data.steamid64;
    } catch {}

    try {
      const partner = new URL(trimmed).searchParams.get('partner');
      if (partner) return (BigInt(partner) + BigInt('76561197960265728')).toString();
    } catch {}
  }

  if (trimmed.includes('steamcommunity.com')) {
    const segments = new URL(trimmed).pathname.split('/').filter(Boolean);
    if (segments[0] === 'profiles') return segments[1];
  }

  if (/^7656119\d{10}$/.test(trimmed)) return trimmed;

  throw new Error('Não foi possível identificar o SteamID.');
}

export async function fetchInventory(steamId: string, tradeLink: string | null, apiKey: string): Promise<InventoryItem[]> {
  let data;

  if (tradeLink) {
    try {
      const res = await axios.get('https://csinventoryapi.com/api/v2/inventory', {
        timeout: 45000,
        params: { api_key: apiKey, url: tradeLink, appid: 730 },
      });
      if (res.data?.assets?.length > 0) data = res.data;
    } catch {}
  }

  if (!data) {
    try {
      const res = await axios.get('https://csinventoryapi.com/api/v1/inventory', {
        timeout: 25000,
        params: { api_key: apiKey, steamid64: steamId, appid: 730, contextid: 2 },
      });
      if (res.data?.assets?.length > 0) data = res.data;
    } catch {}
  }

  if (!data) throw new Error('Não foi possível capturar o inventário.');

  const assets: SteamAsset[] = data.assets || [];
  const descriptions: SteamDescription[] = data.descriptions || [];

  const descMap: Record<string, SteamDescription> = {};
  descriptions.forEach((d: SteamDescription) => {
    descMap[`${d.classid}_${d.instanceid || '0'}`] = d;
  });

  return assets
    .map((asset: SteamAsset) => {
      const desc = descMap[`${asset.classid}_${asset.instanceid || '0'}`];
      return {
        name: desc?.name || asset.market_hash_name,
        market_hash_name: desc?.market_hash_name || asset.market_hash_name,
        image: desc?.icon_url
          ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}`
          : null,
        amount: parseInt(asset.amount ?? '1', 10) || 1,
      };
    })
    .filter((i): i is InventoryItem => typeof i.market_hash_name === 'string');
}