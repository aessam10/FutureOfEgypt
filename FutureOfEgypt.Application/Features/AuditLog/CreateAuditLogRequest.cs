using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.AuditLog
{
    public sealed class CreateAuditLogRequest
    {
        public AuditActionType ActionType { get; set; }

        public Guid? PerformedByUserId { get; set; }

        public string PerformedByEmail { get; set; } = string.Empty;

        public string EntityName { get; set; } = string.Empty;

        public Guid? EntityPublicId { get; set; }

        public string Description { get; set; } = string.Empty;

        public string? MetadataJson { get; set; }
    }
}
