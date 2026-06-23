using System;

namespace FutureOfEgypt.Application.Common.Helpers
{
    public static class TimeZoneHelper
    {
        public static TimeZoneInfo GetTimeZone(string timeZoneId)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                // Fallback for Windows if IANA name fails
                if (timeZoneId == "Africa/Cairo")
                    return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");
                
                throw; // Rethrow if it's an unhandled timezone
            }
            catch (InvalidTimeZoneException)
            {
                if (timeZoneId == "Africa/Cairo")
                    return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");
                    
                throw;
            }
        }
    }
}
