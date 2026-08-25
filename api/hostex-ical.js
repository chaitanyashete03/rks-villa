export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    
    try {
        const response = await fetch("https://hostex.io/web/ical/12771325.ics?t=a53ff0c4e21a146dbfef0170196fef6b");
        if (!response.ok) {
            return res.status(500).json({ error: "Hostex iCal fetch failed" });
        }
        const icalText = await response.text();
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        return res.status(200).send(icalText);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
