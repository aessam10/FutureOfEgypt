using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    public class AppNotification : BaseEntity
    {
        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string Type { get; set; } = "info"; // success, info, warning, error

        public bool IsRead { get; set; } = false;
    }
}
