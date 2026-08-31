export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
    try {
        const timestamp = Date.now();
        const hostexUrl = `https://hostex.io/web/ical/12775375.ics?t=f4e552e719ec0cbf51f1d8f0fc5456b8&_cb=${timestamp}`;
        const response = await fetch(hostexUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ error: "Hostex iCal fetch failed" });
        }

        const icalText = await response.text();
        const events = icalText.split("BEGIN:VEVENT");
        const bookedDates = [];

        for (let i = 1; i < events.length; i++) {
            const ev = events[i];
            const dtStartMatch = ev.match(/DTSTART(?:;VALUE=DATE)?:?(\d{8})/);
            const dtEndMatch = ev.match(/DTEND(?:;VALUE=DATE)?:?(\d{8})/);

            if (dtStartMatch && dtEndMatch) {
                const sStr = dtStartMatch[1];
                const eStr = dtEndMatch[1];

                const start = new Date(parseInt(sStr.substring(0,4)), parseInt(sStr.substring(4,6))-1, parseInt(sStr.substring(6,8)));
                const end = new Date(parseInt(eStr.substring(0,4)), parseInt(eStr.substring(4,6))-1, parseInt(eStr.substring(6,8)));

                for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    bookedDates.push(`${yyyy}-${mm}-${dd}`);
                }
            }
        }

        return res.status(200).json({ success: true, bookedDates, rawIcal: icalText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
