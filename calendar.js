/* ==========================================================================
   RK'S VILLA - HOSTEX & LIVE AVAILABILITY CALENDAR WIDGET
   Features:
   - Dual-month interactive calendar view
   - Available vs Booked date styling
   - Direct Booking Price & Savings Calculator (15-20% OTA comparison)
   - Pre-filled WhatsApp & Web3Forms booking integration
   - Hostex iCal / API sync placeholder
   ========================================================================== */

const VILLA_NIGHTLY_RATE = 18000; // Base rate per night in INR
const OTA_MARKUP_PERCENT = 0.18;   // 18% OTA platform markup savings

// Mock Booked Dates (Format: YYYY-MM-DD) - In production, this syncs via Hostex iCal/API
const BOOKED_DATES = [
    "2026-08-10", "2026-08-11", "2026-08-12",
    "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23",
    "2026-09-05", "2026-09-06",
    "2026-09-18", "2026-09-19", "2026-09-20"
];

class AvailabilityCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.checkInDate = null;
        this.checkOutDate = null;
        this.currentMonth = new Date();

        this.init();
    }

    init() {
        this.render();
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
                            <span class="sync-dot"></span> Hostex PMS Live Sync Active
                        </span>
                        <p style="font-size: 0.8rem; color: var(--color-muted); margin-top: 4px;">
                            Dates automatically updated across Airbnb, Booking.com & Direct Channels.
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
                        <span class="legend-item"><span class="legend-box available"></span> Available (₹18k/n)</span>
                        <span class="legend-item"><span class="legend-box booked"></span> Booked</span>
                        <span class="legend-item"><span class="legend-box selected"></span> Your Stay</span>
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
                            <span>Duration:</span>
                            <span id="calc-nights">-- nights</span>
                        </div>
                        <div class="calc-row flex-between">
                            <span>OTA Platform Rate (Airbnb/Booking):</span>
                            <span id="calc-ota-price" style="text-decoration: line-through; color: var(--color-muted);">₹0</span>
                        </div>
                        <div class="calc-row flex-between calc-highlight">
                            <span>Direct Host Price (Ravi):</span>
                            <strong id="calc-direct-price" style="font-size: 1.3rem; color: var(--color-gold);">₹0</strong>
                        </div>
                        <div class="calc-row flex-between calc-savings">
                            <span>✨ Your Direct Booking Savings:</span>
                            <strong id="calc-savings-amount" style="color: #25D366;">₹0 (Save 18%)</strong>
                        </div>
                        <div class="calc-actions flex-between" style="margin-top: 20px; gap: 15px;">
                            <a id="whatsapp-direct-link" href="#" target="_blank" class="btn btn-primary" style="flex: 1; padding: 14px;">
                                <i data-lucide="message-circle" class="btn-icon"></i> Reserve via WhatsApp
                            </a>
                            <a href="contact.html" class="btn btn-secondary" style="flex: 1; padding: 14px;">
                                Send Booking Form
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
            else if (BOOKED_DATES.includes(dateStr)) {
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

            html += `<td class="${cellClass}" ${isClickable ? `data-date="${dateStr}"` : ''}>${day}</td>`;
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
                } else if (this.checkInDate && !this.checkOutDate) {
                    if (clickedDate > this.checkInDate) {
                        this.checkOutDate = clickedDate;
                    } else {
                        this.checkInDate = clickedDate;
                        this.checkOutDate = null;
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

        if (this.checkInDate && this.checkOutDate) {
            const nights = Math.round((this.checkOutDate - this.checkInDate) / (1000 * 60 * 60 * 24));
            const directTotal = nights * VILLA_NIGHTLY_RATE;
            const otaTotal = Math.round(directTotal * (1 + OTA_MARKUP_PERCENT));
            const savings = otaTotal - directTotal;

            const checkInStr = this.checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const checkOutStr = this.checkOutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            document.getElementById('calc-date-range').textContent = `${checkInStr} - ${checkOutStr}`;
            document.getElementById('calc-nights').textContent = `${nights} night${nights > 1 ? 's' : ''}`;
            document.getElementById('calc-ota-price').textContent = `₹${otaTotal.toLocaleString('en-IN')}`;
            document.getElementById('calc-direct-price').textContent = `₹${directTotal.toLocaleString('en-IN')}`;
            document.getElementById('calc-savings-amount').textContent = `₹${savings.toLocaleString('en-IN')} Saved!`;

            // Pre-fill WhatsApp message
            const waMsg = encodeURIComponent(`Hi Ravi sir, I want to book RK's Villa for ${nights} night(s) from ${checkInStr} to ${checkOutStr}. Direct Rate: ₹${directTotal.toLocaleString('en-IN')}. Please confirm availability!`);
            document.getElementById('whatsapp-direct-link').href = `https://wa.me/919970341234?text=${waMsg}`;

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
