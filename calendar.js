/* ==========================================================================
   RK'S VILLA - HOSTEX & LIVE AVAILABILITY CALENDAR WIDGET
   Features:
   - Dual-month interactive calendar view
   - Available vs Booked date styling
   - Direct Booking Price & Savings Calculator (15-20% OTA comparison)
   - Pre-filled WhatsApp & Web3Forms booking integration
   - Hostex iCal / API sync placeholder
   ========================================================================== */

// Dynamic Rate Matrix matching official RK's Villa pricing breakdown (gallery/asset_web/pricing.jpeg)
// August: Weekdays ₹20,000 / Weekends ₹25,000
// September & October: Weekdays ₹25,000 / Weekends ₹30,000
// Default / Peak Season: Weekdays ₹25,000 / Weekends ₹30,000
// Weekends include Friday, Saturday, and Sunday nights.
function getNightlyRateForDate(date) {
    const m = date.getMonth(); // 0 = Jan ... 7 = Aug, 8 = Sep, 9 = Oct
    const d = date.getDay();   // 0 = Sun, 5 = Fri, 6 = Sat
    const isWeekend = (d === 0 || d === 5 || d === 6);

    if (m === 7) {
        // August
        return isWeekend ? 25000 : 20000;
    } else {
        // September, October & standard high season
        return isWeekend ? 30000 : 25000;
    }
}

const OTA_MARKUP_PERCENT = 0.18;   // 18% OTA platform markup savings
const BASE_OCCUPANCY_PAX = 10;     // Standard rates are for 10 PAX occupancy
const EXTRA_PAX_RATE = 2000;       // Increase in PAX above 12 years: ₹2,000 / person

// Hostex PMS iCal Live Integration (RK's Villa)
const HOSTEX_ICAL_URL = "https://hostex.io/web/ical/12794987.ics?t=58abb7dda177e75d420a0508407c1808";
let BOOKED_DATES = new Set();

class AvailabilityCalendar {
    
    hasBookedDateInRange(startDate, endDate) {
        if (!startDate || !endDate) return false;
        let tempDate = new Date(startDate.getTime());
        tempDate.setHours(0, 0, 0, 0);
        const end = new Date(endDate.getTime());
        end.setHours(0, 0, 0, 0);

        while (tempDate < end) {
            const yyyy = tempDate.getFullYear();
            const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
            const dd = String(tempDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            if (BOOKED_DATES.has(dateStr)) {
                return true;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return false;
    }

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.checkInDate = null;
        this.checkOutDate = null;
        this.currentMonth = new Date();

        this.init();
    }

    async init() {
        this.render();
        await this.syncHostexLiveICal();

        // Auto-sync Hostex live every 30 seconds without page refresh
        setInterval(() => {
            this.syncHostexLiveICal();
        }, 30000);
    }

    async syncHostexLiveICal() {
        const timestamp = Date.now();

        // 1. Try Vercel Serverless Endpoint First (Cleanest, No CORS limits)
        try {
            const apiRes = await fetch(`/api/hostex-ical?_cb=${timestamp}`, { cache: "no-store" });
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData && apiData.success && Array.isArray(apiData.bookedDates)) {
                    const freshSet = new Set(apiData.bookedDates);
                    let changed = false;
                    if (freshSet.size !== BOOKED_DATES.size) {
                        changed = true;
                    } else {
                        for (const d of freshSet) {
                            if (!BOOKED_DATES.has(d)) {
                                changed = true;
                                break;
                            }
                        }
                    }
                    if (changed) {
                        BOOKED_DATES = freshSet;
                        this.render();
                        this.updateCalculator();
                    }
                    return;
                }
            }
        } catch (e) { }

        // 2. Fallback to CORS Proxies if running on local simple HTTP server
        const proxiedUrl = HOSTEX_ICAL_URL + "&_cb=" + timestamp;
        const proxies = [
            "https://corsproxy.io/?" + encodeURIComponent(proxiedUrl),
            "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(proxiedUrl),
            "https://api.allorigins.win/raw?url=" + encodeURIComponent(proxiedUrl)
        ];

        let icalText = null;
        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl, { cache: "no-store" });
                if (response.ok) {
                    const text = await response.text();
                    if (text && text.includes("BEGIN:VCALENDAR")) {
                        icalText = text;
                        break;
                    }
                }
            } catch (e) { }
        }

        if (!icalText) return;

        try {
            const events = icalText.split("BEGIN:VEVENT");
            const freshBookedSet = new Set();

            for (let i = 1; i < events.length; i++) {
                const ev = events[i];
                const dtStartMatch = ev.match(/DTSTART(?:;VALUE=DATE)?:?(\d{8})/);
                const dtEndMatch = ev.match(/DTEND(?:;VALUE=DATE)?:?(\d{8})/);

                if (dtStartMatch && dtEndMatch) {
                    const sStr = dtStartMatch[1];
                    const eStr = dtEndMatch[1];

                    const start = new Date(parseInt(sStr.substring(0, 4)), parseInt(sStr.substring(4, 6)) - 1, parseInt(sStr.substring(6, 8)));
                    const end = new Date(parseInt(eStr.substring(0, 4)), parseInt(eStr.substring(4, 6)) - 1, parseInt(eStr.substring(6, 8)));

                    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        freshBookedSet.add(`${yyyy}-${mm}-${dd}`);
                    }
                }
            }

            // Only re-render if booked dates actually changed, and preserve active selection
            let hasChanged = false;
            if (freshBookedSet.size !== BOOKED_DATES.size) {
                hasChanged = true;
            } else {
                for (const d of freshBookedSet) {
                    if (!BOOKED_DATES.has(d)) {
                        hasChanged = true;
                        break;
                    }
                }
            }

            if (hasChanged) {
                BOOKED_DATES = freshBookedSet;
                this.render();
                this.updateCalculator();
            }
        } catch (e) {
            console.log("Hostex iCal sync completed.");
        }
    }

    render() {
        const month1 = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const month2 = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);

        this.container.innerHTML = `
            <div class="calendar-widget-wrapper">
                <!-- Hostex Sync Status Header -->
                <div class="calendar-header-bar flex-between">
                    <div>
                        <span class="hostex-sync-badge">
                            <span class="sync-dot"></span> Real-Time Calendar Sync
                        </span>
                        <p style="font-size: 0.8rem; color: var(--color-muted); margin-top: 4px;">
                            Dates automatically updated in real time for direct bookings.
                        </p>
                    </div>
                    <div class="calendar-month-nav">
                        <button class="cal-nav-btn" id="prev-month-btn"><i data-lucide="chevron-left"></i></button>
                        <button class="cal-nav-btn" id="next-month-btn"><i data-lucide="chevron-right"></i></button>
                    </div>
                </div>

                <!-- Dual Month Grid -->
                <div class="dual-calendar-grid">
                    <div class="month-container">
                        <h4 class="month-title">${month1.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                        ${this.generateMonthHTML(month1)}
                    </div>
                    <div class="month-container">
                        <h4 class="month-title">${month2.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                        ${this.generateMonthHTML(month2)}
                    </div>
                </div>

                <!-- Legend & Status Indicators -->
                <div class="calendar-legend flex-between">
                    <div class="legend-items">
                        <span class="legend-item"><span class="legend-box available"></span> Available (From ₹20,000/n)</span>
                        <span class="legend-item"><span class="legend-box booked"></span> Booked</span>
                        <span class="legend-item"><span class="legend-box selected"></span> Your Stay</span>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--color-gold); font-weight: 500;">
                        <span>Standard 10 PAX • Extra guest ₹2,000/n</span>
                    </div>
                </div>

                <!-- Live Price & Direct Savings Calculator -->
                <div id="booking-calculator-panel" class="booking-calc-box">
                    <div class="calc-initial-msg">
                        <i data-lucide="calendar" style="color: var(--color-gold); width: 22px; height: 22px;"></i>
                        <span>Select check-in and check-out dates on the calendar to view direct rates & instant savings.</span>
                    </div>
                    <div class="calc-details-content" style="display: none;">
                        <div class="calc-row flex-between">
                            <span>Selected Dates:</span>
                            <strong id="calc-date-range" class="text-gold">--</strong>
                        </div>
                        <div class="calc-row flex-between">
                            <span>Duration & Split:</span>
                            <span id="calc-nights">-- nights</span>
                        </div>
                        <div class="calc-row flex-between">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                Total Guests:
                                <span style="font-size: 0.75rem; color: var(--color-muted);">(10 included)</span>
                            </span>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <select id="calc-guests-select" style="background: var(--color-card-light); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: 4px 10px; font-size: 0.88rem; outline: none; cursor: pointer;">
                                    <option value="1">1 Guest</option>
                                    <option value="2">2 Guests</option>
                                    <option value="4">4 Guests</option>
                                    <option value="6">6 Guests</option>
                                    <option value="8">8 Guests</option>
                                    <option value="10" selected>10 Guests (Standard)</option>
                                    <option value="11">11 Guests (+₹2,000/n)</option>
                                    <option value="12">12 Guests (+₹4,000/n)</option>
                                    <option value="13">13 Guests (+₹6,000/n)</option>
                                    <option value="14">14 Guests (+₹8,000/n)</option>
                                </select>
                            </div>
                        </div>
                        <div id="calc-extra-guest-row" class="calc-row flex-between" style="display: none; color: #f59e0b; font-size: 0.82rem;">
                            <span>Extra Guest Fee (>10 PAX):</span>
                            <span id="calc-extra-guest-amt">₹0</span>
                        </div>
                        <div class="calc-row flex-between">
                            <span>OTA Platform Rate (Airbnb/Booking):</span>
                            <span id="calc-ota-price" style="text-decoration: line-through; color: var(--color-muted);">₹0</span>
                        </div>
                        <div class="calc-row flex-between calc-highlight">
                            <span>Direct Host Price (RK (Ravi)):</span>
                            <div style="text-align: right;">
                                <strong id="calc-direct-price" style="font-size: 1.3rem; color: var(--color-gold);">₹0</strong>
                                <div style="font-size: 0.72rem; color: var(--color-muted); margin-top: 2px;">Taxes applicable at checkout</div>
                            </div>
                        </div>
                        <div class="calc-row flex-between calc-savings">
                            <span>✨ Your Direct Booking Savings:</span>
                            <strong id="calc-savings-amount" style="color: #25D366;">₹0 (Save 18%)</strong>
                        </div>
                        <div class="calc-actions flex-between" style="margin-top: 20px; gap: 15px;">
                            <a id="whatsapp-direct-link" href="#" target="_blank" class="btn btn-primary" style="flex: 1; padding: 14px;">
                                <i data-lucide="message-circle" class="btn-icon"></i> Reserve via WhatsApp
                            </a>
                            <a id="calc-contact-form-link" href="contact.html" class="btn btn-secondary" style="flex: 1; padding: 14px;">
                                <i data-lucide="mail" class="btn-icon"></i> Send Booking Form
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.attachEvents();
    }

    generateMonthHTML(dateObj) {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = `
            <table class="calendar-table">
                <thead>
                    <tr>
                        <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
        `;

        // Empty cells before first day
        for (let i = 0; i < firstDayIndex; i++) {
            html += `<td class="empty-cell"></td>`;
        }

        let dayCount = firstDayIndex;

        for (let day = 1; day <= totalDays; day++) {
            if (dayCount % 7 === 0 && dayCount !== 0) {
                html += `</tr><tr>`;
            }

            const currentCellDate = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let cellClass = "day-cell available";
            let isClickable = true;

            // Check if past date
            if (currentCellDate < today) {
                cellClass = "day-cell past";
                isClickable = false;
            }
            // Check if booked
            else if (BOOKED_DATES.has(dateStr)) {
                cellClass = "day-cell booked";
                isClickable = false;
            }

            // Check if selected range
            if (this.checkInDate && this.checkOutDate) {
                if (currentCellDate >= this.checkInDate && currentCellDate <= this.checkOutDate) {
                    cellClass += " in-range";
                }
            }
            if (this.checkInDate && currentCellDate.getTime() === this.checkInDate.getTime()) {
                cellClass += " selected-checkin";
            }
            if (this.checkOutDate && currentCellDate.getTime() === this.checkOutDate.getTime()) {
                cellClass += " selected-checkout";
            }

            const rateBadge = isClickable ? `<span class="day-rate">₹${(getNightlyRateForDate(currentCellDate)/1000)}k</span>` : '';
            html += `<td class="${cellClass}" ${isClickable ? `data-date="${dateStr}"` : ''}><span class="day-num">${day}</span>${rateBadge}</td>`;
            dayCount++;
        }

        // Fill trailing empty cells
        while (dayCount % 7 !== 0) {
            html += `<td class="empty-cell"></td>`;
            dayCount++;
        }

        html += `</tr></tbody></table>`;
        return html;
    }

    attachEvents() {
        const prevBtn = document.getElementById('prev-month-btn');
        const nextBtn = document.getElementById('next-month-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.render();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.render();
            });
        }

        // Guest selector change listener
        const guestSelect = this.container.querySelector('#calc-guests-select');
        if (guestSelect) {
            guestSelect.addEventListener('change', () => {
                this.updateCalculator();
            });
        }

        // Day click handlers
        const dayCells = this.container.querySelectorAll('.day-cell.available');
        dayCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const clickedDateStr = e.currentTarget.dataset.date;
                const clickedDate = new Date(clickedDateStr + 'T00:00:00');

                if (!this.checkInDate || (this.checkInDate && this.checkOutDate)) {
                    // Start new selection
                    this.checkInDate = clickedDate;
                    this.checkOutDate = null;
                    this.rangeErrorMessage = null;
                } else if (this.checkInDate && !this.checkOutDate) {
                    if (clickedDate > this.checkInDate) {
                        // Check if intermediate nights contain booked dates
                        if (this.hasBookedDateInRange(this.checkInDate, clickedDate)) {
                            const prevCheckInStr = this.checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                            const newCheckInStr = clickedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                            this.checkInDate = clickedDate;
                            this.checkOutDate = null;
                            this.rangeErrorMessage = `Selected range contained booked dates after ${prevCheckInStr}. Check-in reset to ${newCheckInStr}. Now select check-out.`;
                        } else {
                            this.checkOutDate = clickedDate;
                            this.rangeErrorMessage = null;
                        }
                    } else {
                        this.checkInDate = clickedDate;
                        this.checkOutDate = null;
                        this.rangeErrorMessage = null;
                    }
                }

                this.render();
                this.updateCalculator();
            });
        });
    }

    updateCalculator() {
        const initialMsg = this.container.querySelector('.calc-initial-msg');
        const calcContent = this.container.querySelector('.calc-details-content');

        // Remove old warning message if present
        const oldWarn = this.container.querySelector('.calc-warning-msg');
        if (oldWarn) oldWarn.remove();

        if (this.rangeErrorMessage) {
            const warnDiv = document.createElement('div');
            warnDiv.className = 'calc-warning-msg';
            warnDiv.style.cssText = 'background: rgba(220, 53, 69, 0.15); border: 1px solid rgba(220, 53, 69, 0.4); color: #ff6b6b; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 8px;';
            warnDiv.innerHTML = `<i data-lucide="alert-triangle" style="width: 18px; height: 18px; flex-shrink: 0;"></i> <span>${this.rangeErrorMessage}</span>`;
            const calcBox = this.container.querySelector('.booking-calc-box');
            if (calcBox) calcBox.prepend(warnDiv);
        }

        if (this.checkInDate && this.checkOutDate) {
            // Calculate nights and dynamic night-by-night rates
            let nights = 0;
            let weekdayNights = 0;
            let weekendNights = 0;
            let baseDirectTotal = 0;

            const temp = new Date(this.checkInDate.getTime());
            while (temp < this.checkOutDate) {
                const nightlyRate = getNightlyRateForDate(temp);
                baseDirectTotal += nightlyRate;
                const d = temp.getDay();
                if (d === 0 || d === 5 || d === 6) {
                    weekendNights++;
                } else {
                    weekdayNights++;
                }
                nights++;
                temp.setDate(temp.getDate() + 1);
            }

            // Guest Count & Extra Pax calculation (above 10 PAX is ₹2,000/person/night)
            const guestSelect = document.getElementById('calc-guests-select');
            const totalGuests = guestSelect ? parseInt(guestSelect.value, 10) : 10;
            const extraPax = Math.max(0, totalGuests - BASE_OCCUPANCY_PAX);
            const extraPaxFee = extraPax * EXTRA_PAX_RATE * nights;

            const extraGuestRow = document.getElementById('calc-extra-guest-row');
            const extraGuestAmt = document.getElementById('calc-extra-guest-amt');
            if (extraGuestRow && extraGuestAmt) {
                if (extraPax > 0) {
                    extraGuestRow.style.display = 'flex';
                    extraGuestAmt.textContent = `+₹${extraPaxFee.toLocaleString('en-IN')} (${extraPax} extra guest${extraPax > 1 ? 's' : ''} × ${nights}n)`;
                } else {
                    extraGuestRow.style.display = 'none';
                }
            }

            const directTotal = baseDirectTotal + extraPaxFee;
            const otaTotal = Math.round(directTotal * (1 + OTA_MARKUP_PERCENT));
            const savings = otaTotal - directTotal;

            const checkInStr = this.checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const checkOutStr = this.checkOutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            document.getElementById('calc-date-range').textContent = `${checkInStr} - ${checkOutStr}`;
            
            // Helpful breakdown text
            let nightsBreakdown = `${nights} night${nights > 1 ? 's' : ''}`;
            if (weekdayNights > 0 && weekendNights > 0) {
                nightsBreakdown += ` (${weekdayNights} weekday, ${weekendNights} weekend)`;
            } else if (weekendNights > 0) {
                nightsBreakdown += ` (Weekend stay)`;
            } else if (weekdayNights > 0) {
                nightsBreakdown += ` (Weekday stay)`;
            }
            document.getElementById('calc-nights').textContent = nightsBreakdown;

            document.getElementById('calc-ota-price').textContent = `₹${otaTotal.toLocaleString('en-IN')}`;
            document.getElementById('calc-direct-price').textContent = `₹${directTotal.toLocaleString('en-IN')}`;
            document.getElementById('calc-savings-amount').textContent = `₹${savings.toLocaleString('en-IN')} Saved!`;

            // Pre-fill clean, natural WhatsApp booking inquiry
            const guestText = totalGuests > 10 ? ` (${totalGuests} guests including ${extraPax} extra PAX)` : ` (${totalGuests} guests)`;
            const waMsg = encodeURIComponent(`Hi Ravi, I want to book RK's Villa for ${nights} night(s) from ${checkInStr} to ${checkOutStr}${guestText}. Direct Rate: ₹${directTotal.toLocaleString('en-IN')}. Please confirm availability and share payment details.`);
            document.getElementById('whatsapp-direct-link').href = `https://wa.me/919970341234?text=${waMsg}`;

            // Pre-fill Send Booking Form link with query parameters
            const ciY = this.checkInDate.getFullYear();
            const ciM = String(this.checkInDate.getMonth() + 1).padStart(2, '0');
            const ciD = String(this.checkInDate.getDate()).padStart(2, '0');
            const coY = this.checkOutDate.getFullYear();
            const coM = String(this.checkOutDate.getMonth() + 1).padStart(2, '0');
            const coD = String(this.checkOutDate.getDate()).padStart(2, '0');
            const formUrl = `contact.html?checkin=${ciY}-${ciM}-${ciD}&checkout=${coY}-${coM}-${coD}&guests=${totalGuests}&rate=${directTotal}`;
            const contactBtn = document.getElementById('calc-contact-form-link');
            if (contactBtn) {
                contactBtn.href = formUrl;
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();

            initialMsg.style.display = 'none';
            calcContent.style.display = 'block';
        } else if (this.checkInDate) {
            initialMsg.style.display = 'flex';
            initialMsg.querySelector('span').textContent = `Check-in: ${this.checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Now select your Check-out date.`;
            calcContent.style.display = 'none';
        }
    }
}

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new AvailabilityCalendar('availability-calendar-container');
});
