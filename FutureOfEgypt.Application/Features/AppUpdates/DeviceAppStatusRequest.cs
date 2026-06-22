using System.ComponentModel.DataAnnotations;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public class DeviceAppStatusRequest
    {
        [Required]
        [MaxLength(100)]
        public string InstallationId { get; set; } = string.Empty;

        public Guid? DevicePublicId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AppVersionName { get; set; } = string.Empty;

        [Required]
        public int AppVersionCode { get; set; }

        public AppUpdateStatus? ClientStatus { get; set; }

        [MaxLength(2000)]
        public string? LastError { get; set; }
    }
}
