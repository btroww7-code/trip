import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchParams {
  from: string;
  to: string;
  date?: string;
}

interface Location {
  name: string;
  id: string;
}

interface RouteSegment {
  type: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: number;
  carrier: string;
  line?: string;
  stops?: string[];
}

interface Route {
  id: string;
  segments: RouteSegment[];
  totalDuration: number;
  departureTime: string;
  arrivalTime: string;
  price?: number;
  currency?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "suggest") {
      const query = url.searchParams.get("query");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const suggestions = await fetchSuggestions(query);
      return new Response(JSON.stringify(suggestions), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const date = url.searchParams.get("date");

      if (!from || !to) {
        return new Response(
          JSON.stringify({ error: "Missing from or to parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const routes = await searchRoutes({ from, to, date: date || undefined });
      return new Response(JSON.stringify(routes), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'suggest' or 'search'" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fetchSuggestions(query: string): Promise<Location[]> {
  try {
    const response = await fetch(
      `https://e-podroznik.pl/public/suggest.do?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        name: item.label || item.name || item.value || "",
        id: item.id || item.value || "",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

async function searchRoutes(params: SearchParams): Promise<Route[]> {
  try {
    const departureDate = params.date || new Date().toISOString().split("T")[0];
    
    const formData = new URLSearchParams();
    formData.append("method", "task");
    formData.append("fromText", params.from);
    formData.append("toText", params.to);
    formData.append("departureDate", departureDate);
    formData.append("searchType", "ONE_WAY");

    const response = await fetch(
      "https://e-podroznik.pl/public/searcherFinal.do",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const routes = parseRoutesFromHTML(html);

    return routes;
  } catch (error) {
    console.error("Error searching routes:", error);
    throw error;
  }
}

function parseRoutesFromHTML(html: string): Route[] {
  const routes: Route[] = [];

  try {
    const connectionMatches = html.matchAll(
      /<div[^>]*class="[^"]*connection-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi
    );

    let routeId = 0;
    for (const match of connectionMatches) {
      const connectionHtml = match[1];
      
      const departureMatch = connectionHtml.match(/godzina\s+wyjazdu[^>]*>\s*<[^>]+>([^<]+)</);
      const arrivalMatch = connectionHtml.match(/godzina\s+przyjazdu[^>]*>\s*<[^>]+>([^<]+)</);
      const fromMatch = connectionHtml.match(/miejsce\s+wyjazdu[^>]*>\s*<[^>]+>([^<]+)</);
      const toMatch = connectionHtml.match(/miejsce\s+przyjazdu[^>]*>\s*<[^>]+>([^<]+)</);
      const carrierMatch = connectionHtml.match(/przewoźnik[^>]*>\s*<[^>]+>([^<]+)</);
      const lineMatch = connectionHtml.match(/linia[^>]*>\s*<[^>]+>([^<]+)</);
      const priceMatch = connectionHtml.match(/cena[^>]*>\s*<[^>]+>([\d,]+)/);

      if (departureMatch && arrivalMatch && fromMatch && toMatch) {
        const departureTime = departureMatch[1].trim();
        const arrivalTime = arrivalMatch[1].trim();
        const from = fromMatch[1].trim();
        const to = toMatch[1].trim();
        const carrier = carrierMatch ? carrierMatch[1].trim() : "";
        const line = lineMatch ? lineMatch[1].trim() : undefined;
        const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : undefined;

        const duration = calculateDuration(departureTime, arrivalTime);

        const segment: RouteSegment = {
          type: "bus",
          from,
          to,
          departure: departureTime,
          arrival: arrivalTime,
          duration,
          carrier,
          line,
        };

        routes.push({
          id: `route-${routeId++}`,
          segments: [segment],
          totalDuration: duration,
          departureTime,
          arrivalTime,
          price,
          currency: price ? "PLN" : undefined,
        });
      }
    }

    if (routes.length === 0) {
      const simpleMatches = html.matchAll(
        /(\d{2}:\d{2})[^<]*<[^>]+>([^<]+)<[\s\S]{0,500}?(\d{2}:\d{2})/gi
      );

      for (const match of simpleMatches) {
        if (routes.length >= 10) break;
        
        const departureTime = match[1];
        const arrivalTime = match[3];
        const duration = calculateDuration(departureTime, arrivalTime);

        routes.push({
          id: `route-${routeId++}`,
          segments: [
            {
              type: "bus",
              from: "Początek",
              to: "Koniec",
              departure: departureTime,
              arrival: arrivalTime,
              duration,
              carrier: "PKS",
            },
          ],
          totalDuration: duration,
          departureTime,
          arrivalTime,
        });
      }
    }
  } catch (error) {
    console.error("Error parsing HTML:", error);
  }

  return routes;
}

function calculateDuration(departure: string, arrival: string): number {
  try {
    const [depHours, depMinutes] = departure.split(":").map(Number);
    const [arrHours, arrMinutes] = arrival.split(":").map(Number);

    let depTotalMinutes = depHours * 60 + depMinutes;
    let arrTotalMinutes = arrHours * 60 + arrMinutes;

    if (arrTotalMinutes < depTotalMinutes) {
      arrTotalMinutes += 24 * 60;
    }

    return (arrTotalMinutes - depTotalMinutes) * 60;
  } catch {
    return 0;
  }
}
