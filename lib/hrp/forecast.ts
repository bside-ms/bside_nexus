// Planned hours cover the 23rd to the last day of the payroll month.
export const FORECAST_FIRST_DAY = 23;
// Sanity limit: at most 9 days of 24 hours.
export const FORECAST_MAX_HOURS = 216;

export interface ForecastWindow {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    label: string;
}

export const getForecastWindow = (year: number, month: number): ForecastWindow => {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const monthPart = String(month + 1).padStart(2, '0');

    return {
        from: `${year}-${monthPart}-${FORECAST_FIRST_DAY}`,
        to: `${year}-${monthPart}-${lastDay}`,
        label: `${FORECAST_FIRST_DAY}.–${lastDay}.${monthPart}.${year}`,
    };
};

export const isValidForecastHours = (hours: number): boolean =>
    Number.isFinite(hours) && hours >= 0 && hours <= FORECAST_MAX_HOURS && Number.isInteger(hours * 4);
