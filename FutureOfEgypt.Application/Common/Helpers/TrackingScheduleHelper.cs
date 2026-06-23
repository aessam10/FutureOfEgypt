using FutureOfEgypt.Application.Common.Models;
using System;

namespace FutureOfEgypt.Application.Common.Helpers
{
    public static class TrackingScheduleHelper
    {
        public static bool IsWithinWorkingHours(TrackingScheduleOptions options, DateTime utcNow)
        {
            if (!options.Enabled)
                return true;

            var timeZone = TimeZoneHelper.GetTimeZone(options.TimeZone);
            var localTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow, timeZone);
            var timeOfDay = localTime.TimeOfDay;

            if (!TimeSpan.TryParse(options.StartTime, out var start) || !TimeSpan.TryParse(options.EndTime, out var end))
            {
                return true; // Fallback to allowed if config is invalid
            }

            if (start <= end)
            {
                // Normal same-day window (e.g., 08:30 to 17:00)
                return timeOfDay >= start && timeOfDay <= end;
            }
            else
            {
                // Overnight window (e.g., 22:00 to 06:00)
                return timeOfDay >= start || timeOfDay <= end;
            }
        }
    }
}
